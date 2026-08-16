import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import { type PoolClient } from 'pg';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';

const UUID = /^[0-9a-f-]{36}$/i;
const CODE = /^[A-Za-z0-9_-]{8,48}$/;
const SCENARIOS = new Set(['employee', 'campaign', 'channel']);

const text = (value: unknown, max: number, required = false) => {
  if (value === undefined || value === null || value === '') {
    if (required) throw new BadRequestException('VALIDATION_ERROR');
    return null;
  }
  if (typeof value !== 'string' || value.trim().length > max)
    throw new BadRequestException('VALIDATION_ERROR');
  return value.trim();
};

const targetPath = (value: unknown) => {
  const path = text(value, 300) ?? '/c/entry';
  if (!path.startsWith('/c/') || path.startsWith('//') || path.includes('\\'))
    throw new BadRequestException('VALIDATION_ERROR');
  return path;
};

@Injectable()
export class EmployeeShareService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  async list(context: OrganizationContext) {
    const employee = await this.employee(context);
    const result = await this.pool.query(
      `select s.id,s.code,s.scenario,s.target_path,s.expires_at,s.status,s.created_at,s.version,
        count(e.id)::int as opens
       from employee_share_codes s
       left join employee_share_code_events e on e.share_code_id=s.id and e.tenant_id=s.tenant_id and e.deleted_at is null
       where s.tenant_id=$1 and s.employee_id=$2 and s.deleted_at is null
       group by s.id order by s.created_at desc`,
      [context.tenantId, employee.id],
    );
    return result.rows.map((row) => this.output(row));
  }

  async create(
    context: OrganizationContext,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    if (!key.trim() || key.length > 200) throw new BadRequestException('VALIDATION_ERROR');
    const scenario = text(body.scenario, 32, true);
    if (!scenario || !SCENARIOS.has(scenario)) throw new BadRequestException('VALIDATION_ERROR');
    const path = targetPath(body.targetPath);
    const expiryValue = text(body.expiresAt, 40);
    const expiresAt = expiryValue ? new Date(expiryValue) : null;
    if (expiresAt && (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()))
      throw new BadRequestException('VALIDATION_ERROR');
    const employee = await this.employee(context);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const replay = await client.query(
        "select response from idempotency_keys where tenant_id=$1 and resource_type='employee_share_code' and idempotency_key=$2 and deleted_at is null",
        [context.tenantId, key],
      );
      if (replay.rowCount) {
        await client.query('commit');
        return replay.rows[0].response;
      }
      const row = (
        await client.query(
          `insert into employee_share_codes(id,tenant_id,employee_id,code,scenario,target_path,expires_at,created_by,updated_by)
           values($1,$2,$3,$4,$5,$6,$7,$8,$8)
           returning id,code,scenario,target_path,expires_at,status,created_at,version`,
          [
            randomUUID(),
            context.tenantId,
            employee.id,
            randomBytes(12).toString('base64url'),
            scenario,
            path,
            expiresAt,
            context.userId,
          ],
        )
      ).rows[0];
      const data = this.output(row);
      const correlation = UUID.test(requestId) ? requestId : randomUUID();
      await this.audit(client, context, 'employee.share_code_created', row.id, correlation, data);
      await this.outbox(
        client,
        context,
        'employee.share_code.created.v1',
        row.id,
        correlation,
        data,
      );
      // L2 share-sent trace (no payment fields) for funnel pairing.
      await client.query(
        `insert into entry_funnel_events(
           id, tenant_id, actor_role, event_code, surface, module_key, share_code,
           source, scene, session_id, device, payload, occurred_at
         ) values (
           $1,$2,'employee','share','share','employee_share_create',$3,
           $4,$5,$6,'mobile',$7,now()
         )`,
        [
          randomUUID(),
          context.tenantId,
          row.code,
          scenario,
          'employee_share',
          correlation,
          JSON.stringify({ shareCodeId: row.id, targetPath: path }),
        ],
      );
      await client.query(
        'insert into idempotency_keys(id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6)',
        [randomUUID(), context.tenantId, 'employee_share_code', key, data, context.userId],
      );
      await client.query('commit');
      return data;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async revoke(
    context: OrganizationContext,
    id: string,
    body: Record<string, unknown>,
    requestId: string,
  ) {
    if (!UUID.test(id) || !Number.isInteger(body.version))
      throw new BadRequestException('VALIDATION_ERROR');
    const employee = await this.employee(context);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const current = await client.query(
        'select id,code,scenario,target_path,expires_at,status,created_at,version from employee_share_codes where id=$1 and tenant_id=$2 and employee_id=$3 and deleted_at is null for update',
        [id, context.tenantId, employee.id],
      );
      if (!current.rowCount) throw new NotFoundException('NOT_FOUND');
      const row = current.rows[0];
      if (row.version !== body.version) throw new BadRequestException('VERSION_CONFLICT');
      if (row.status !== 'revoked') {
        row.status = (
          await client.query(
            "update employee_share_codes set status='revoked',version=version+1,updated_at=now(),updated_by=$1 where id=$2 and tenant_id=$3 returning status,version",
            [context.userId, id, context.tenantId],
          )
        ).rows[0].status;
        row.version += 1;
        const correlation = UUID.test(requestId) ? requestId : randomUUID();
        const data = this.output(row);
        await this.audit(client, context, 'employee.share_code_revoked', id, correlation, data);
        await this.outbox(client, context, 'employee.share_code.revoked.v1', id, correlation, data);
      }
      await client.query('commit');
      return this.output(row);
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  /** L2 分享配对闭环保底：每码 发出↔打开↔进店↔出站↔回访，全部由真实 entry_funnel_events 现场推导。 */
  async pairing(context: OrganizationContext, id: string) {
    if (!UUID.test(id)) throw new BadRequestException('VALIDATION_ERROR');
    const employee = await this.employee(context);
    const codeRow = await this.pool.query(
      `select s.code,s.scenario,s.target_path,s.status,s.created_at
       from employee_share_codes s
       where s.id=$1 and s.tenant_id=$2 and s.employee_id=$3 and s.deleted_at is null`,
      [id, context.tenantId, employee.id],
    );
    if (!codeRow.rowCount) throw new NotFoundException('NOT_FOUND');
    const code = codeRow.rows[0].code as string;

    const [totals, timeRows, sent, recent] = await Promise.all([
      this.pool.query(
        `select
           count(*) filter (where event_code='share_open')::int as opens,
           count(*) filter (where event_code='visit')::int as entry_visits,
           count(*) filter (where event_code='jump')::int as jumps,
           count(*) filter (where event_code='jump_confirm')::int as jump_confirms,
           count(*) filter (where event_code='dwell')::int as dwells,
           count(distinct session_id) filter (where event_code='share_open')::int as open_sessions
         from entry_funnel_events
         where tenant_id=$1 and share_code=$2 and occurred_at >= now() - interval '30 days'`,
        [context.tenantId, code],
      ),
      this.pool.query(
        `select to_char(occurred_at at time zone 'Asia/Shanghai', 'YYYY-MM-DD') as day,
                count(*) filter (where event_code='share_open')::int as opens,
                count(*) filter (where event_code='visit')::int as visits,
                count(*) filter (where event_code='jump')::int as jumps
         from entry_funnel_events
         where tenant_id=$1 and share_code=$2 and occurred_at >= now() - interval '30 days'
         group by 1 order by 1 asc`,
        [context.tenantId, code],
      ),
      this.pool.query(
        `select occurred_at as sent_at from entry_funnel_events
         where tenant_id=$1 and share_code=$2 and event_code='share' and actor_role='employee'
         order by occurred_at asc limit 1`,
        [context.tenantId, code],
      ),
      this.pool.query(
        `select e.occurred_at,
                e.event_code,
                coalesce(nullif(e.surface,''), '(未知面)') as surface,
                coalesce(nullif(e.device,''), 'h5') as device,
                left(e.session_id, 8) as session_tag
         from entry_funnel_events e
         where e.tenant_id=$1 and e.share_code=$2 and e.event_code in ('share_open','visit','jump')
           and e.occurred_at >= now() - interval '30 days'
         order by e.occurred_at desc
         limit 12`,
        [context.tenantId, code],
      ),
    ]);

    const t = totals.rows[0] ?? {};
    const opens = Number(t.opens ?? 0);
    const entryVisits = Number(t.entry_visits ?? 0);
    const jumps = Number(t.jumps ?? 0);
    const jumpConfirms = Number(t.jump_confirms ?? 0);
    const dwells = Number(t.dwells ?? 0);
    const openSessions = Number(t.open_sessions ?? 0);
    // 回访：同一会话出现多次 share_open/visit（再次进入），按 share_open 会话号去重保守计数。
    const revisitRows = await this.pool.query(
      `select session_id from entry_funnel_events
       where tenant_id=$1 and share_code=$2 and event_code in ('share_open','visit')
         and session_id is not null and occurred_at >= now() - interval '30 days'
       group by session_id having count(*) > 1`,
      [context.tenantId, code],
    );
    const revisits = revisitRows.rowCount ?? 0;

    const openToVisitRate = opens > 0 ? Number(((entryVisits / opens) * 100).toFixed(1)) : 0;
    const openToJumpRate = opens > 0 ? Number(((jumps / opens) * 100).toFixed(1)) : 0;

    return {
      code,
      scenario: codeRow.rows[0].scenario as string,
      targetPath: codeRow.rows[0].target_path as string,
      status: codeRow.rows[0].status as string,
      shareSentAt: sent.rows[0]?.sent_at ?? null,
      totals: {
        opens,
        entryVisits,
        jumps,
        jumpConfirms,
        dwells,
        openSessions,
        revisits,
        openToVisitRate,
        openToJumpRate,
      },
      byDate: timeRows.rows.map((r) => ({
        day: r.day as string,
        opens: Number(r.opens ?? 0),
        visits: Number(r.visits ?? 0),
        jumps: Number(r.jumps ?? 0),
      })),
      pairings: recent.rows.map((r) => ({
        at: r.occurred_at,
        event: r.event_code as string,
        surface: r.surface as string,
        device: r.device as string,
        session: r.session_tag as string,
      })),
      disclaimer:
        '仅统计至打开/进店/出站/停留等入口痕迹（source=local）；回访按同一会话多次进入提醒，不代表成交，不含支付金额与第三方订单履约。',
    };
  }

  async open(code: string) {
    if (!CODE.test(code)) throw new BadRequestException('VALIDATION_ERROR');
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const found = await client.query(
        `select s.id,s.tenant_id,s.code,s.scenario,s.target_path,s.expires_at,s.status,s.created_at,s.version,t.slug as tenant_slug
         from employee_share_codes s join tenants t on t.id=s.tenant_id
         where s.code=$1 and s.status='active' and s.deleted_at is null and t.status='active' and t.deleted_at is null
           and (s.expires_at is null or s.expires_at > now()) for update`,
        [code],
      );
      if (!found.rowCount) throw new NotFoundException('NOT_FOUND');
      const row = found.rows[0];
      const eventId = randomUUID(),
        correlation = randomUUID();
      await client.query(
        "insert into employee_share_code_events(id,tenant_id,share_code_id,event_type,created_by,updated_by) values($1,$2,$3,'opened',null,null)",
        [eventId, row.tenant_id, row.id],
      );
      const details = { shareCodeId: row.id, scenario: row.scenario, eventId };
      await client.query(
        "insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,null,'employee.share_code_opened','employee_share_code',$3,$4,'page-e-005',$5,null,null)",
        [randomUUID(), row.tenant_id, row.id, correlation, details],
      );
      await client.query(
        "insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,'employee.share_code.opened.v1','employee_share_code',$3,$4,$5,'page-e-005',null,null)",
        [randomUUID(), row.tenant_id, row.id, details, correlation],
      );
      await client.query(
        `insert into entry_funnel_events(
           id, tenant_id, actor_role, event_code, surface, module_key, share_code,
           source, scene, session_id, device, payload, occurred_at
         ) values (
           $1,$2,'anonymous','share_open','share','share_landing',$3,
           $4,'share_open',$5,'mobile',$6,now()
         )`,
        [
          randomUUID(),
          row.tenant_id,
          row.code,
          row.scenario,
          correlation,
          JSON.stringify({ shareCodeId: row.id, eventId }),
        ],
      );
      await client.query('commit');
      return {
        code: row.code,
        scenario: row.scenario,
        targetPath: row.target_path,
        tenant: row.tenant_slug,
      };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  private output(row: Record<string, unknown>) {
    const expiry = row.expires_at ? new Date(String(row.expires_at)) : null;
    return {
      id: row.id,
      code: row.code,
      scenario: row.scenario,
      targetPath: row.target_path,
      expiresAt: row.expires_at,
      status: row.status === 'active' && expiry && expiry <= new Date() ? 'expired' : row.status,
      createdAt: row.created_at,
      version: row.version,
      opens: Number(row.opens ?? 0),
    };
  }

  private async employee(context: OrganizationContext) {
    const result = await this.pool.query(
      "select e.id from employees e join memberships m on m.id=e.membership_id and m.tenant_id=e.tenant_id where e.tenant_id=$1 and m.user_id=$2 and e.status='active' and m.status='active' and e.deleted_at is null and m.deleted_at is null",
      [context.tenantId, context.userId],
    );
    if (!result.rowCount) throw new ForbiddenException('FORBIDDEN');
    return result.rows[0];
  }

  private async audit(
    client: PoolClient,
    context: OrganizationContext,
    action: string,
    id: string,
    correlation: string,
    details: unknown,
  ) {
    await client.query(
      'insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$3,$3)',
      [
        randomUUID(),
        context.tenantId,
        context.userId,
        action,
        'employee_share_code',
        id,
        correlation,
        'page-e-005',
        details,
      ],
    );
  }

  private async outbox(
    client: PoolClient,
    context: OrganizationContext,
    event: string,
    id: string,
    correlation: string,
    payload: unknown,
  ) {
    await client.query(
      'insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)',
      [
        randomUUID(),
        context.tenantId,
        event,
        'employee_share_code',
        id,
        payload,
        correlation,
        'page-e-005',
        context.userId,
      ],
    );
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
