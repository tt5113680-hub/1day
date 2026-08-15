import {
  BadRequestException,
  ConflictException,
  Injectable,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';
import { PlatformOnboardingService } from './platform-onboarding.service';

const uuid = /^[0-9a-f-]{36}$/i;
const text = (value: unknown, max: number) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max)
    throw new BadRequestException('VALIDATION_ERROR');
  return value.trim();
};
const slug = (value: unknown) => {
  const result = text(value, 80);
  if (!/^[a-z0-9-]+$/.test(result)) throw new BadRequestException('VALIDATION_ERROR');
  return result;
};

/**
 * G1-W∞-125 — Channel merchant onboarding delegates to the shared Tenant READY Run
 * (`source_mode=channel_referral`). Channel no longer owns a separate basic-init path.
 *
 * Honest boundary: onboarding only registers channel affiliation + local READY delivery;
 * no funds/GMV/payment; circle dual-approval remains separate and does not block READY.
 */
@Injectable()
export class ChannelMerchantOnboardingService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  constructor(private readonly platformOnboarding: PlatformOnboardingService) {}

  async list(platformTenantId: string, channelIds: string[] | null = null) {
    const scoped = channelIds !== null;
    const result = await this.pool.query(
      `select o.id,o.channel_id,c.code channel_code,c.name channel_name,o.merchant_tenant_id,t.slug,t.name,o.invitation_email,o.invitation_status,o.template_code,o.plan,o.delivery_status,o.delivery_note,o.delivered_at,o.version,o.created_at,
              r.id provisioning_run_id,r.state provisioning_state
       from channel_merchant_onboardings o
       join platform_channels c on c.id=o.channel_id and c.tenant_id=o.tenant_id and c.deleted_at is null
       join tenants t on t.id=o.merchant_tenant_id and t.deleted_at is null
       left join lateral (
         select id, state
         from tenant_provisioning_runs r0
         where r0.tenant_id=o.merchant_tenant_id
           and r0.requested_by_tenant_id=o.tenant_id
           and r0.deleted_at is null
         order by r0.created_at desc
         limit 1
       ) r on true
       where o.tenant_id=$1 and o.deleted_at is null${scoped ? ' and o.channel_id = any($2::uuid[])' : ''}
       order by o.created_at desc`,
      scoped ? [platformTenantId, channelIds] : [platformTenantId],
    );
    return result.rows.map((row) => ({
      id: row.id,
      channelId: row.channel_id,
      channelCode: row.channel_code,
      channelName: row.channel_name,
      merchantTenantId: row.merchant_tenant_id,
      slug: row.slug,
      name: row.name,
      invitationEmail: row.invitation_email,
      invitationStatus: row.invitation_status,
      template: row.template_code,
      plan: row.plan,
      deliveryStatus: row.delivery_status,
      deliveryNote: row.delivery_note,
      deliveredAt: row.delivered_at,
      version: row.version,
      createdAt: row.created_at,
      runId: row.provisioning_run_id ?? null,
      provisioningState: row.provisioning_state ?? null,
    }));
  }

  async create(
    context: OrganizationContext,
    body: Record<string, unknown>,
    idempotencyKey: string,
    requestId: string,
  ) {
    if (!idempotencyKey.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const input = {
      channelId: text(body.channelId, 36),
      slug: slug(body.slug),
      tenantName: text(body.tenantName, 160),
      organizationName: text(body.organizationName, 160),
      storeName: text(body.storeName, 160),
      adminName: text(body.adminName, 160),
      adminEmail: text(body.adminEmail, 320).toLowerCase(),
      adminPassword: text(body.adminPassword, 128),
      template: text(body.template, 32),
      plan: text(body.plan, 32),
    };
    if (
      !uuid.test(input.channelId) ||
      !/.+@.+\..+/.test(input.adminEmail) ||
      input.adminPassword.length < 12 ||
      !['starter', 'service'].includes(input.template) ||
      !['starter', 'growth', 'enterprise'].includes(input.plan)
    )
      throw new BadRequestException('VALIDATION_ERROR');

    const replay = await this.pool.query(
      'select response from idempotency_keys where tenant_id=$1 and resource_type=$2 and idempotency_key=$3',
      [context.tenantId, 'channel_merchant_onboarding', idempotencyKey],
    );
    if (replay.rowCount) return replay.rows[0].response;

    const channel = (
      await this.pool.query(
        "select id,code,name from platform_channels where id=$1 and tenant_id=$2 and status='active' and deleted_at is null",
        [input.channelId, context.tenantId],
      )
    ).rows[0];
    if (!channel) throw new BadRequestException('CHANNEL_NOT_AVAILABLE');

    // Shared READY command — same 11-step trail as /p/tenants/new
    const run = await this.platformOnboarding.create(
      context,
      {
        slug: input.slug,
        tenantName: input.tenantName,
        organizationName: input.organizationName,
        merchantName: input.tenantName,
        storeName: input.storeName,
        address: typeof body.address === 'string' && body.address.trim() ? body.address : '待商家补充',
        phone: typeof body.phone === 'string' && body.phone.trim() ? body.phone : '00000000000',
        businessHours:
          typeof body.businessHours === 'string' && body.businessHours.trim()
            ? body.businessHours
            : '待商家确认',
        adminName: input.adminName,
        adminEmail: input.adminEmail,
        adminPassword: input.adminPassword,
        template: input.template,
        plan: input.plan,
        sourceMode: 'channel_referral',
        channelId: input.channelId,
      },
      `channel-ready:${idempotencyKey}`,
      requestId,
    );

    if (run.state !== 'ready' || !run.tenantId) {
      throw new BadRequestException('CHANNEL_READY_FAILED');
    }

    const onboardingId = randomUUID();
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const again = await client.query(
        'select response from idempotency_keys where tenant_id=$1 and resource_type=$2 and idempotency_key=$3',
        [context.tenantId, 'channel_merchant_onboarding', idempotencyKey],
      );
      if (again.rowCount) {
        await client.query('commit');
        return again.rows[0].response;
      }
      await client.query(
        'insert into channel_merchant_onboardings(id,tenant_id,channel_id,merchant_tenant_id,invitation_email,template_code,plan,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$8)',
        [
          onboardingId,
          context.tenantId,
          channel.id,
          run.tenantId,
          input.adminEmail,
          input.template,
          input.plan,
          context.userId,
        ],
      );
      const response = {
        id: onboardingId,
        channelId: channel.id,
        channelCode: channel.code,
        tenantId: run.tenantId,
        slug: input.slug,
        invitationStatus: 'prepared',
        template: input.template,
        plan: input.plan,
        deliveryStatus: 'pending',
        runId: run.runId,
        provisioningState: run.state,
        steps: run.steps,
        delivery: run.delivery,
      };
      await client.query(
        "insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,'channel.merchant_onboarding_created','channel_merchant_onboarding',$4,$5,'w125-channel-ready',$6,$3,$3)",
        [randomUUID(), context.tenantId, context.userId, onboardingId, requestId, response],
      );
      await client.query(
        "insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,'channel.merchant_onboarding.created.v1','channel_merchant_onboarding',$3,$4,$5,'w125-channel-ready',$6,$6)",
        [randomUUID(), context.tenantId, onboardingId, response, requestId, context.userId],
      );
      await client.query(
        'insert into idempotency_keys(id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6)',
        [
          randomUUID(),
          context.tenantId,
          'channel_merchant_onboarding',
          idempotencyKey,
          response,
          context.userId,
        ],
      );
      await client.query('commit');
      return response;
    } catch (error) {
      await client.query('rollback');
      if ((error as { code?: string }).code === '23505') throw new ConflictException('CONFLICT');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateDelivery(
    context: OrganizationContext,
    id: string,
    body: Record<string, unknown>,
    idempotencyKey: string,
    requestId: string,
  ) {
    if (!uuid.test(id) || !idempotencyKey.trim() || !Number.isInteger(body.version))
      throw new BadRequestException('VALIDATION_ERROR');
    const status = text(body.status, 32),
      note = text(body.note, 500);
    if (!['delivered', 'failed', 'pending'].includes(status))
      throw new BadRequestException('VALIDATION_ERROR');
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const replay = await client.query(
        'select response from idempotency_keys where tenant_id=$1 and resource_type=$2 and idempotency_key=$3',
        [context.tenantId, 'channel_merchant_delivery', idempotencyKey],
      );
      if (replay.rowCount) {
        await client.query('commit');
        return replay.rows[0].response;
      }
      const current = (
        await client.query(
          'select id,merchant_tenant_id,channel_id,version from channel_merchant_onboardings where id=$1 and tenant_id=$2 and deleted_at is null',
          [id, context.tenantId],
        )
      ).rows[0];
      if (!current) throw new ConflictException('CONFLICT');
      // CH-02: cannot mark delivered unless shared READY run succeeded
      if (status === 'delivered') {
        const ready = await client.query(
          "select 1 from tenant_provisioning_runs where tenant_id=$1 and requested_by_tenant_id=$2 and state='ready' and deleted_at is null limit 1",
          [current.merchant_tenant_id, context.tenantId],
        );
        if (!ready.rowCount) throw new BadRequestException('READY_REQUIRED');
      }
      const updated = (
        await client.query(
          "update channel_merchant_onboardings set delivery_status=$1::varchar,delivery_note=$2,delivered_at=case when $1::varchar='delivered' then now() else null end,version=version+1,updated_at=now(),updated_by=$3 where id=$4 and tenant_id=$5 and version=$6 and deleted_at is null returning id,merchant_tenant_id,channel_id,delivery_status,delivery_note,version",
          [status, note, context.userId, id, context.tenantId, body.version],
        )
      ).rows[0];
      if (!updated) throw new ConflictException('CONFLICT');
      await client.query(
        "update platform_channel_merchants set onboarding_status=case when $1='delivered' then 'active' when $1='failed' then 'paused' else 'onboarding' end,service_status=case when $1='delivered' then 'ready' when $1='failed' then 'blocked' else 'pending' end,version=version+1,updated_at=now(),updated_by=$2 where channel_id=$3 and merchant_tenant_id=$4 and tenant_id=$5 and deleted_at is null",
        [status, context.userId, updated.channel_id, updated.merchant_tenant_id, context.tenantId],
      );
      await client.query(
        "insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,'channel.merchant_delivery_updated','channel_merchant_onboarding',$4,$5,'w125-channel-ready',$6,$3,$3)",
        [randomUUID(), context.tenantId, context.userId, id, requestId, updated],
      );
      await client.query(
        "insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,'channel.merchant_delivery.updated.v1','channel_merchant_onboarding',$3,$4,$5,'w125-channel-ready',$6,$6)",
        [randomUUID(), context.tenantId, id, updated, requestId, context.userId],
      );
      await client.query(
        'insert into idempotency_keys(id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6)',
        [
          randomUUID(),
          context.tenantId,
          'channel_merchant_delivery',
          idempotencyKey,
          updated,
          context.userId,
        ],
      );
      await client.query('commit');
      return updated;
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
