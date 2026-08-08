import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { createApiPool } from './database-pool';
import { ConsumerOperatingOrchestrator } from './consumer-operating-orchestrator.service';

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

const shareCode = (value: unknown) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{8,48}$/.test(value))
    throw new BadRequestException('VALIDATION_ERROR');
  return value;
};
const scene = (value: unknown) => source(value);
const storeId = (value: unknown) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !UUID.test(value))
    throw new BadRequestException('VALIDATION_ERROR');
  return value;
};

@Injectable()
export class ConsumerActionService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  constructor(private readonly operating: ConsumerOperatingOrchestrator) {}

  async detail(tenantSlug: string, actionId: string) {
    const { tenant, action } = await this.action(tenantSlug, actionId);
    return { tenant: { slug: tenant.slug, name: tenant.name }, action: this.output(action) };
  }

  async confirm(tenantSlug: string, actionId: string, key: string, body: Record<string, unknown>) {
    if (!key.trim() || key.length > 200) throw new BadRequestException('VALIDATION_ERROR');
    const { tenant, action } = await this.action(tenantSlug, actionId);
    const eventSource = source(body.source);
    const safeReturnTo = returnTo(body.returnTo);
    const safeShareCode = shareCode(body.shareCode);
    const safeScene = scene(body.scene);
    const safeStoreId = storeId(body.storeId);
    if (safeStoreId) await this.assertStoreAction(tenant.id, safeStoreId, action.id);
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      await client.query('select pg_advisory_xact_lock(hashtext($1),hashtext($2))', [
        tenant.id,
        `consumer-action-confirm:${key}`,
      ]);
      const prior = await client.query(
        'select id,source from consumer_action_redirect_events where tenant_id=$1 and idempotency_key=$2 and deleted_at is null',
        [tenant.id, key],
      );
      if (prior.rowCount) {
        const correlationId = randomUUID();
        const traceId = randomUUID();
        const operating = await this.operating.project(client, {
          tenantId: tenant.id,
          eventType: 'consumer_action_redirect_event',
          eventId: prior.rows[0].id,
          actionId: action.id,
          storeId: safeStoreId,
          source: prior.rows[0].source,
          shareCode: safeShareCode,
          correlationId,
          traceId,
        });
        await client.query('commit');
        return this.confirmed(prior.rows[0].id, action, safeReturnTo, true, operating);
      }
      const eventId = randomUUID();
      await client.query(
        'insert into consumer_action_redirect_events(id,tenant_id,action_id,store_id,source,scene,share_code,return_to,idempotency_key,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,null,null)',
        [
          eventId,
          tenant.id,
          action.id,
          safeStoreId,
          eventSource,
          safeScene,
          safeShareCode,
          safeReturnTo,
          key,
        ],
      );
      const details = {
        actionId,
        storeId: safeStoreId,
        source: eventSource,
        scene: safeScene,
        shareCode: safeShareCode,
        returnTo: safeReturnTo,
        targetUrl: action.target_url,
      };
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
      const operating = await this.operating.project(client, {
        tenantId: tenant.id,
        eventType: 'consumer_action_redirect_event',
        eventId,
        actionId: action.id,
        storeId: safeStoreId,
        source: eventSource,
        shareCode: safeShareCode,
        correlationId,
        traceId,
      });
      await client.query('commit');
      return this.confirmed(eventId, action, safeReturnTo, false, operating);
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  private async assertStoreAction(tenantId: string, safeStoreId: string, actionId: string) {
    const result = await this.pool.query(
      `select 1 from stores s where s.id=$1 and s.tenant_id=$2 and s.status='active' and s.deleted_at is null
       and (exists(select 1 from store_external_actions sea where sea.store_id=s.id and sea.tenant_id=s.tenant_id and sea.external_action_id=$3 and sea.enabled and sea.deleted_at is null)
            or exists(select 1 from store_benefits sb where sb.store_id=s.id and sb.tenant_id=s.tenant_id and sb.external_action_id=$3 and sb.status='active' and sb.deleted_at is null))`,
      [safeStoreId, tenantId, actionId],
    );
    if (!result.rowCount) throw new NotFoundException('NOT_FOUND');
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
    operating: unknown,
  ) {
    return {
      eventId,
      replayed,
      operating,
      action: this.output(action),
      returnTo: safeReturnTo,
      destination: action.action_type === 'link' ? action.target_url : null,
    };
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
