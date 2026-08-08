import { BadRequestException, Injectable, OnModuleDestroy } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';

const codes = new Set(['wechat', 'douyin', 'meituan', 'manual-import']);
const uuid = /^[0-9a-f-]{36}$/i;
const text = (value: unknown, maximum: number) =>
  typeof value === 'string' && value.trim() && value.trim().length <= maximum
    ? value.trim()
    : (() => {
        throw new BadRequestException('VALIDATION_ERROR');
      })();

@Injectable()
export class ManagementConnectorService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  async list(context: OrganizationContext) {
    const connectors = (
      await this.pool.query(
        `select x.id,x.code,x.status,x.secret_fingerprint,x.version,x.updated_at,coalesce(l.logs,'[]'::json) logs from connector_configs x left join lateral(select json_agg(json_build_object('status',status,'message',message,'createdAt',created_at) order by created_at desc) logs from (select status,message,created_at from connector_logs where connector_id=x.id and tenant_id=x.tenant_id order by created_at desc limit 5) s) l on true where x.tenant_id=$1 and x.deleted_at is null order by x.code`,
        [context.tenantId],
      )
    ).rows;
    return connectors.map((connector) => ({
      ...connector,
      capability: {
        authorization: 'intent_recorded_only',
        externalDelivery: 'not_available',
        requiredEvidence: 'manual_external_receipt',
      },
    }));
  }

  async requestAuthorization(
    context: OrganizationContext,
    body: Record<string, unknown>,
    idempotencyKey: string,
    requestId: string,
  ) {
    if (!idempotencyKey.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const code = text(body.code, 64);
    const secret = text(body.secret, 500);
    if (!codes.has(code)) throw new BadRequestException('VALIDATION_ERROR');

    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const previous = await client.query(
        'select response from idempotency_keys where tenant_id=$1 and resource_type=$2 and idempotency_key=$3',
        [context.tenantId, 'connector_config', idempotencyKey],
      );
      if (previous.rowCount) {
        await client.query('commit');
        return previous.rows[0].response;
      }

      const correlationId = uuid.test(requestId) ? requestId : randomUUID();
      const fingerprint = createHash('sha256').update(secret).digest('hex').slice(0, 16);
      const config = (
        await client.query(
          "insert into connector_configs(id,tenant_id,code,status,secret_fingerprint,created_by,updated_by) values($1,$2,$3,'pending_authorization',$4,$5,$5) on conflict(tenant_id,code) do update set status='pending_authorization',secret_fingerprint=excluded.secret_fingerprint,updated_by=excluded.updated_by,updated_at=now(),version=connector_configs.version+1 returning id,code,status,secret_fingerprint,version",
          [randomUUID(), context.tenantId, code, fingerprint, context.userId],
        )
      ).rows[0];

      await client.query(
        "insert into connector_logs(id,tenant_id,connector_id,status,message) values($1,$2,$3,'pending_authorization','Authorization requested; no external call has been made.')",
        [randomUUID(), context.tenantId, config.id],
      );
      await client.query(
        'insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$3,$3)',
        [
          randomUUID(),
          context.tenantId,
          context.userId,
          'connector.authorization_requested',
          'connector_config',
          config.id,
          correlationId,
          'page-m-015',
          { code, fingerprint },
        ],
      );
      await client.query(
        'insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)',
        [
          randomUUID(),
          context.tenantId,
          'connector.authorization.requested.v1',
          'connector_config',
          config.id,
          { code, fingerprint },
          correlationId,
          'page-m-015',
          context.userId,
        ],
      );
      await client.query(
        'insert into idempotency_keys(id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6)',
        [
          randomUUID(),
          context.tenantId,
          'connector_config',
          idempotencyKey,
          config,
          context.userId,
        ],
      );
      await client.query('commit');
      return config;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
