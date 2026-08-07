import {
  BadRequestException,
  ConflictException,
  Injectable,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import type { OrganizationContext } from './organization.service';

const code = (value: unknown) => {
  if (typeof value !== 'string' || !/^[a-z0-9-]{2,80}$/.test(value))
    throw new BadRequestException('VALIDATION_ERROR');
  return value;
};
const text = (value: unknown, length: number) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > length)
    throw new BadRequestException('VALIDATION_ERROR');
  return value.trim();
};
const uuid = /^[0-9a-f-]{36}$/i;
const onboarding = new Set(['invited', 'onboarding', 'active', 'paused']);
const service = new Set(['pending', 'ready', 'degraded', 'blocked']);

@Injectable()
export class PlatformChannelService implements OnModuleDestroy {
  private readonly pool = new Pool({ connectionString: process.env.DATABASE_URL });

  async list(context: OrganizationContext) {
    const [channels, merchantPool] = await Promise.all([
      this.pool.query(
        `select c.id,c.code,c.name,c.status,c.onboarding_status,c.service_status,c.version,
          coalesce(json_agg(json_build_object('tenantId',m.merchant_tenant_id,'slug',t.slug,'name',t.name,'onboardingStatus',m.onboarding_status,'serviceStatus',m.service_status,'version',m.version) order by t.name) filter(where m.id is not null),'[]') merchants
         from platform_channels c
         left join platform_channel_merchants m on m.channel_id=c.id and m.tenant_id=c.tenant_id and m.deleted_at is null
         left join tenants t on t.id=m.merchant_tenant_id and t.deleted_at is null
         where c.tenant_id=$1 and c.deleted_at is null
         group by c.id order by c.created_at`,
        [context.tenantId],
      ),
      this.pool.query(
        "select id,slug,name,status from tenants where id<>$1 and status='active' and deleted_at is null order by created_at desc",
        [context.tenantId],
      ),
    ]);
    return {
      channels: channels.rows.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        status: row.status,
        onboardingStatus: row.onboarding_status,
        serviceStatus: row.service_status,
        version: row.version,
        merchants: row.merchants,
      })),
      merchantPool: merchantPool.rows.map((row) => ({
        tenantId: row.id,
        slug: row.slug,
        name: row.name,
        status: row.status,
      })),
    };
  }

  async create(
    context: OrganizationContext,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    if (!key.trim() || !uuid.test(requestId)) throw new BadRequestException('VALIDATION_ERROR');
    const input = {
      code: code(body.code),
      name: text(body.name, 160),
      merchantTenantId: text(body.merchantTenantId, 36),
      onboardingStatus: text(body.onboardingStatus, 32),
      serviceStatus: text(body.serviceStatus, 32),
    };
    if (
      !uuid.test(input.merchantTenantId) ||
      !onboarding.has(input.onboardingStatus) ||
      !service.has(input.serviceStatus)
    )
      throw new BadRequestException('VALIDATION_ERROR');
    const q = await this.pool.connect();
    try {
      await q.query('begin');
      const replay = await q.query(
        'select response from idempotency_keys where tenant_id=$1 and resource_type=$2 and idempotency_key=$3',
        [context.tenantId, 'platform_channel', key],
      );
      if (replay.rowCount) {
        await q.query('commit');
        return replay.rows[0].response;
      }
      const merchant = (
        await q.query(
          'select id,slug,name from tenants where id=$1 and status=$2 and deleted_at is null',
          [input.merchantTenantId, 'active'],
        )
      ).rows[0];
      if (!merchant) throw new BadRequestException('MERCHANT_TENANT_NOT_AVAILABLE');
      const channelId = randomUUID();
      try {
        await q.query(
          'insert into platform_channels(id,tenant_id,code,name,onboarding_status,service_status,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$7)',
          [
            channelId,
            context.tenantId,
            input.code,
            input.name,
            'open',
            input.serviceStatus,
            context.userId,
          ],
        );
      } catch (error: unknown) {
        if ((error as { code?: string }).code === '23505') throw new ConflictException('CONFLICT');
        throw error;
      }
      await q.query(
        'insert into platform_channel_merchants(id,tenant_id,channel_id,merchant_tenant_id,onboarding_status,service_status,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$7)',
        [
          randomUUID(),
          context.tenantId,
          channelId,
          merchant.id,
          input.onboardingStatus,
          input.serviceStatus,
          context.userId,
        ],
      );
      const response = {
        id: channelId,
        code: input.code,
        name: input.name,
        merchant: { tenantId: merchant.id, slug: merchant.slug, name: merchant.name },
        onboardingStatus: input.onboardingStatus,
        serviceStatus: input.serviceStatus,
      };
      await q.query(
        "insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,'platform.channel_created','platform_channel',$4,$5,'page-p-004',$6,$3,$3)",
        [randomUUID(), context.tenantId, context.userId, channelId, requestId, response],
      );
      await q.query(
        "insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,'platform.channel.created.v1','platform_channel',$3,$4,$5,'page-p-004',$6,$6)",
        [randomUUID(), context.tenantId, channelId, response, requestId, context.userId],
      );
      await q.query(
        'insert into idempotency_keys(id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6)',
        [randomUUID(), context.tenantId, 'platform_channel', key, response, context.userId],
      );
      await q.query('commit');
      return response;
    } catch (error) {
      await q.query('rollback');
      throw error;
    } finally {
      q.release();
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
