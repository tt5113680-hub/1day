import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import type { OrganizationContext } from './organization.service';
const UUID = /^[0-9a-f-]{36}$/i,
  TYPES = new Set(['link', 'mini_program', 'platform_entry']);
const text = (v: unknown, n: number) => {
  if (typeof v !== 'string' || !v.trim() || v.trim().length > n)
    throw new BadRequestException('VALIDATION_ERROR');
  return v.trim();
};
const correlation = (r: string) => (UUID.test(r) ? r : randomUUID());
function input(b: Record<string, unknown>) {
  const actionType = text(b.actionType, 32);
  if (!TYPES.has(actionType)) throw new BadRequestException('VALIDATION_ERROR');
  const common = {
    code: text(b.code, 80),
    name: text(b.name, 120),
    actionType,
    platform: b.platform === undefined ? null : text(b.platform, 64),
  };
  if (actionType === 'link') {
    const targetUrl = text(b.targetUrl, 2000);
    let url: URL;
    try {
      url = new URL(targetUrl);
    } catch {
      throw new BadRequestException('VALIDATION_ERROR');
    }
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password)
      throw new BadRequestException('VALIDATION_ERROR');
    return { ...common, targetUrl: url.toString(), appId: null, path: null };
  }
  if (actionType === 'mini_program') {
    const appId = text(b.miniProgramAppId, 128),
      path = text(b.miniProgramPath, 1024);
    if (!/^\/[^\s]*$/.test(path)) throw new BadRequestException('VALIDATION_ERROR');
    return { ...common, targetUrl: null, appId, path };
  }
  if (!common.platform) throw new BadRequestException('VALIDATION_ERROR');
  return { ...common, targetUrl: null, appId: null, path: null };
}
@Injectable()
export class ExternalActionService implements OnModuleDestroy {
  private readonly pool = new Pool({ connectionString: process.env.DATABASE_URL });
  async list(c: OrganizationContext) {
    return (
      await this.pool.query(
        'select id,code,name,action_type,target_url,mini_program_app_id,mini_program_path,platform,status,version from external_actions where tenant_id=$1 and status=$2 and deleted_at is null order by created_at',
        [c.tenantId, 'active'],
      )
    ).rows;
  }
  async create(c: OrganizationContext, b: Record<string, unknown>, key: string, r: string) {
    if (!key.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const i = input(b);
    return this.idempotent(c, 'external_action', key, async (q) => {
      const id = randomUUID(),
        row = (
          await q.query(
            'insert into external_actions(id,tenant_id,code,name,action_type,target_url,mini_program_app_id,mini_program_path,platform,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10) returning id,code,name,action_type,target_url,mini_program_app_id,mini_program_path,platform,status,version',
            [
              id,
              c.tenantId,
              i.code,
              i.name,
              i.actionType,
              i.targetUrl,
              i.appId,
              i.path,
              i.platform,
              c.userId,
            ],
          )
        ).rows[0];
      await this.audit(q, c, 'external_action.created', id, r, row);
      await this.event(q, c, 'external_action.created.v1', id, r, row);
      return row;
    });
  }
  async open(c: OrganizationContext, id: string, b: Record<string, unknown>, r: string) {
    if (!UUID.test(id)) throw new BadRequestException('VALIDATION_ERROR');
    const context = b.context === undefined ? {} : b.context;
    if (
      !context ||
      typeof context !== 'object' ||
      Array.isArray(context) ||
      JSON.stringify(context).length > 4000
    )
      throw new BadRequestException('VALIDATION_ERROR');
    const q = await this.pool.connect();
    try {
      await q.query('begin');
      const action = (
        await q.query(
          'select * from external_actions where id=$1 and tenant_id=$2 and status=$3 and deleted_at is null',
          [id, c.tenantId, 'active'],
        )
      ).rows[0];
      if (!action) throw new NotFoundException('NOT_FOUND');
      const eventId = randomUUID();
      await q.query(
        'insert into external_action_events(id,tenant_id,action_id,event_type,actor_id,context,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$5,$5)',
        [eventId, c.tenantId, id, 'opened', c.userId, context],
      );
      const data = { eventId, action: this.output(action) };
      await this.audit(q, c, 'external_action.opened', id, r, data);
      await this.event(q, c, 'external_action.opened.v1', id, r, data);
      await q.query('commit');
      return data;
    } catch (e) {
      await q.query('rollback');
      throw e;
    } finally {
      q.release();
    }
  }
  private output(x: Record<string, unknown>) {
    return {
      id: x.id,
      code: x.code,
      name: x.name,
      actionType: x.action_type,
      targetUrl: x.target_url,
      miniProgramAppId: x.mini_program_app_id,
      miniProgramPath: x.mini_program_path,
      platform: x.platform,
      version: x.version,
    };
  }
  private async idempotent(
    c: OrganizationContext,
    t: string,
    k: string,
    a: (q: PoolClient) => Promise<Record<string, unknown>>,
  ) {
    const q = await this.pool.connect();
    try {
      await q.query('begin');
      const p = await q.query(
        'select response from idempotency_keys where tenant_id=$1 and resource_type=$2 and idempotency_key=$3',
        [c.tenantId, t, k],
      );
      if (p.rowCount) {
        await q.query('commit');
        return p.rows[0].response;
      }
      const d = await a(q);
      await q.query(
        'insert into idempotency_keys(id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6)',
        [randomUUID(), c.tenantId, t, k, d, c.userId],
      );
      await q.query('commit');
      return d;
    } catch (e) {
      await q.query('rollback');
      if (
        typeof e === 'object' &&
        e !== null &&
        'code' in e &&
        (e as { code: string }).code === '23505'
      )
        throw new ConflictException('CONFLICT');
      throw e;
    } finally {
      q.release();
    }
  }
  private async audit(
    q: Pool | PoolClient,
    c: OrganizationContext,
    a: string,
    id: string,
    r: string,
    d: unknown,
  ) {
    await q.query(
      'insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$3,$3)',
      [randomUUID(), c.tenantId, c.userId, a, 'external_action', id, correlation(r), 'core-009', d],
    );
  }
  private async event(
    q: Pool | PoolClient,
    c: OrganizationContext,
    t: string,
    id: string,
    r: string,
    p: unknown,
  ) {
    const x = correlation(r);
    await q.query(
      'insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)',
      [randomUUID(), c.tenantId, t, 'external_action', id, { payload: p }, x, 'core-009', c.userId],
    );
  }
  async onModuleDestroy() {
    await this.pool.end();
  }
}
