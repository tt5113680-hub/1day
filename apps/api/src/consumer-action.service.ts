import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';

const SLUG = /^[a-z0-9][a-z0-9-]{0,62}$/;
const UUID = /^[0-9a-f-]{36}$/i;

const source = (value: unknown) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > 160 || !/^[a-zA-Z0-9:_-]+$/.test(value))
    throw new BadRequestException('VALIDATION_ERROR');
  return value;
};

const returnTo = (value: unknown) => {
  if (value === undefined || value === null || value === '') return null;
  if (
    typeof value !== 'string' ||
    value.length > 2048 ||
    !value.startsWith('/c/') ||
    value.startsWith('//')
  )
    throw new BadRequestException('VALIDATION_ERROR');
  return value;
};

@Injectable()
export class ConsumerActionService implements OnModuleDestroy {
  private readonly pool = new Pool({ connectionString: process.env.DATABASE_URL });

  async detail(tenantSlug: string, actionId: string) {
    const { tenant, action } = await this.action(tenantSlug, actionId);
    return { tenant: { slug: tenant.slug, name: tenant.name }, action: this.output(action) };
  }

  async confirm(tenantSlug: string, actionId: string, key: string, body: Record<string, unknown>) {
    if (!key.trim() || key.length > 200) throw new BadRequestException('VALIDATION_ERROR');
    const { tenant, action } = await this.action(tenantSlug, actionId);
    const eventSource = source(body.source);
    const safeReturnTo = returnTo(body.returnTo);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const prior = await client.query(
        'select id from consumer_action_redirect_events where tenant_id=$1 and idempotency_key=$2 and deleted_at is null',
        [tenant.id, key],
      );
      if (prior.rowCount) {
        await client.query('commit');
        return this.confirmed(prior.rows[0].id, action, safeReturnTo, true);
      }
      const eventId = randomUUID();
      await client.query(
        'insert into consumer_action_redirect_events(id,tenant_id,action_id,source,return_to,idempotency_key,created_by,updated_by) values($1,$2,$3,$4,$5,$6,null,null)',
        [eventId, tenant.id, action.id, eventSource, safeReturnTo, key],
      );
      const details = { actionId, source: eventSource, returnTo: safeReturnTo };
      const correlationId = randomUUID();
      const traceId = randomUUID();
      await client.query(
        "insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,null,'consumer.action_redirect_confirmed','consumer_action_redirect_event',$3,$4,$5,$6,null,null)",
        [randomUUID(), tenant.id, eventId, correlationId, traceId, details],
      );
      await client.query(
        "insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,'consumer.action.redirect.confirmed.v1','consumer_action_redirect_event',$3,$4,$5,$6,null,null)",
        [randomUUID(), tenant.id, eventId, details, correlationId, traceId],
      );
      await client.query('commit');
      return this.confirmed(eventId, action, safeReturnTo, false);
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  private async action(tenantSlug: string, actionId: string) {
    if (!SLUG.test(tenantSlug) || !UUID.test(actionId))
      throw new BadRequestException('VALIDATION_ERROR');
    const tenant = (
      await this.pool.query(
        "select id,slug,name from tenants where slug=$1 and status='active' and deleted_at is null",
        [tenantSlug],
      )
    ).rows[0];
    if (!tenant) throw new NotFoundException('NOT_FOUND');
    const action = (
      await this.pool.query(
        "select id,code,name,action_type,target_url,mini_program_app_id,mini_program_path,platform from external_actions where id=$1 and tenant_id=$2 and status='active' and deleted_at is null",
        [actionId, tenant.id],
      )
    ).rows[0];
    if (!action) throw new NotFoundException('NOT_FOUND');
    return { tenant, action };
  }

  private output(action: Record<string, string | null>) {
    return {
      id: action.id,
      name: action.name,
      actionType: action.action_type,
      targetUrl: action.target_url,
      miniProgramAppId: action.mini_program_app_id,
      miniProgramPath: action.mini_program_path,
      platform: action.platform,
      copyCode: action.code,
    };
  }

  private confirmed(
    eventId: string,
    action: Record<string, string | null>,
    safeReturnTo: string | null,
    replayed: boolean,
  ) {
    return {
      eventId,
      replayed,
      action: this.output(action),
      returnTo: safeReturnTo,
      destination: action.action_type === 'link' ? action.target_url : null,
    };
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
