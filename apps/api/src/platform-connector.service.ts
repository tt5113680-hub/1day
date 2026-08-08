import {
  BadRequestException,
  ConflictException,
  Injectable,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';

const code = (value: unknown) => {
  if (typeof value !== 'string' || !/^[a-z0-9-]{2,64}$/.test(value))
    throw new BadRequestException('VALIDATION_ERROR');
  return value;
};
const text = (value: unknown, maximum: number) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maximum)
    throw new BadRequestException('VALIDATION_ERROR');
  return value.trim();
};
const number = (value: unknown) => {
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 6000)
    throw new BadRequestException('VALIDATION_ERROR');
  return value as number;
};
const modes = new Set(['api_key', 'oauth', 'manual']);
const health = new Set(['healthy', 'degraded', 'unavailable']);

@Injectable()
export class PlatformConnectorService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  async list(context: OrganizationContext) {
    return (
      await this.pool.query(
        `select d.id,d.code,d.name,d.auth_mode,d.rate_limit_per_minute,d.health_status,d.health_checked_at,d.status,d.version,
          coalesce(a.authorizations,'[]'::json) authorizations,coalesce(l.logs,'[]'::json) logs
         from platform_connector_definitions d
         left join lateral (select json_agg(json_build_object('status',status,'count',count) order by status) authorizations from (select status,count(*)::int count from connector_configs where code=d.code and deleted_at is null group by status) q) a on true
         left join lateral (select json_agg(json_build_object('status',status,'message',message,'observedAt',observed_at) order by observed_at desc) logs from (select status,message,observed_at from platform_connector_logs where connector_id=d.id and tenant_id=d.tenant_id order by observed_at desc limit 5) q) l on true
         where d.tenant_id=$1 and d.deleted_at is null order by d.code`,
        [context.tenantId],
      )
    ).rows;
  }

  async create(
    context: OrganizationContext,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    if (!key.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const input = {
      code: code(body.code),
      name: text(body.name, 120),
      authMode: text(body.authMode, 32),
      rate: number(body.rateLimitPerMinute),
    };
    if (!modes.has(input.authMode)) throw new BadRequestException('VALIDATION_ERROR');
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const replay = await client.query(
        'select response from idempotency_keys where tenant_id=$1 and resource_type=$2 and idempotency_key=$3',
        [context.tenantId, 'platform_connector_definition', key],
      );
      if (replay.rowCount) {
        await client.query('commit');
        return replay.rows[0].response;
      }
      const id = randomUUID();
      let row;
      try {
        row = (
          await client.query(
            'insert into platform_connector_definitions(id,tenant_id,code,name,auth_mode,rate_limit_per_minute,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$7) returning id,code,name,auth_mode,rate_limit_per_minute,health_status,status,version',
            [
              id,
              context.tenantId,
              input.code,
              input.name,
              input.authMode,
              input.rate,
              context.userId,
            ],
          )
        ).rows[0];
      } catch (error: unknown) {
        if ((error as { code?: string }).code === '23505') throw new ConflictException('CONFLICT');
        throw error;
      }
      await this.record(
        client,
        context,
        'platform.connector_defined',
        'platform.connector.defined.v1',
        id,
        row,
        requestId,
      );
      await client.query(
        'insert into idempotency_keys(id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6)',
        [randomUUID(), context.tenantId, 'platform_connector_definition', key, row, context.userId],
      );
      await client.query('commit');
      return row;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async observe(
    context: OrganizationContext,
    id: string,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    if (!/^[0-9a-f-]{36}$/i.test(id) || !key.trim())
      throw new BadRequestException('VALIDATION_ERROR');
    const status = text(body.status, 32);
    const message = text(body.message, 500);
    const version = number(body.version);
    if (!health.has(status)) throw new BadRequestException('VALIDATION_ERROR');
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const replay = await client.query(
        'select response from idempotency_keys where tenant_id=$1 and resource_type=$2 and idempotency_key=$3',
        [context.tenantId, 'platform_connector_observation', key],
      );
      if (replay.rowCount) {
        await client.query('commit');
        return replay.rows[0].response;
      }
      const row = (
        await client.query(
          'update platform_connector_definitions set health_status=$1,health_checked_at=now(),updated_at=now(),updated_by=$2,version=version+1 where id=$3 and tenant_id=$4 and version=$5 and deleted_at is null returning id,code,health_status,health_checked_at,version',
          [status, context.userId, id, context.tenantId, version],
        )
      ).rows[0];
      if (!row) throw new ConflictException('CONFLICT');
      await client.query(
        'insert into platform_connector_logs(id,tenant_id,connector_id,status,message,created_by) values($1,$2,$3,$4,$5,$6)',
        [randomUUID(), context.tenantId, id, status, message, context.userId],
      );
      await this.record(
        client,
        context,
        'platform.connector_health_observed',
        'platform.connector.health_observed.v1',
        id,
        row,
        requestId,
      );
      await client.query(
        'insert into idempotency_keys(id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6)',
        [
          randomUUID(),
          context.tenantId,
          'platform_connector_observation',
          key,
          row,
          context.userId,
        ],
      );
      await client.query('commit');
      return row;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  private async record(
    client: { query: (query: string, values: unknown[]) => Promise<unknown> },
    context: OrganizationContext,
    action: string,
    event: string,
    id: string,
    data: unknown,
    requestId: string,
  ) {
    await client.query(
      "insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,$4,'platform_connector',$5,$6,'page-p-007',$7,$3,$3)",
      [randomUUID(), context.tenantId, context.userId, action, id, requestId, data],
    );
    await client.query(
      "insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,$3,'platform_connector',$4,$5,$6,'page-p-007',$7,$7)",
      [randomUUID(), context.tenantId, event, id, data, requestId, context.userId],
    );
  }
  async onModuleDestroy() {
    await this.pool.end();
  }
}
