import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createApiPool } from './database-pool';

@Injectable()
export class ChannelDashboardService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  async overview(platformTenantId: string, channelIds: string[] | null = null) {
    const scoped = channelIds !== null;
    const channelFilter = scoped ? ' and m.channel_id = any($2::uuid[])' : '';
    const channelFilterC = scoped ? ' and c.id = any($2::uuid[])' : '';
    const params = scoped ? [platformTenantId, channelIds] : [platformTenantId];
    const [metrics, rows] = await Promise.all([
      this.pool.query(
        `select
          count(*)::int merchant_count,
          count(*) filter(where m.onboarding_status='active')::int onboarded_count,
          count(*) filter(where exists(select 1 from tasks x where x.tenant_id=m.merchant_tenant_id and x.updated_at>=now()-interval '30 days' and x.deleted_at is null) or exists(select 1 from customer_orders o where o.tenant_id=m.merchant_tenant_id and o.occurred_at>=now()-interval '30 days' and o.deleted_at is null))::int active_count,
          count(*) filter(where m.onboarding_status='active' and (not (exists(select 1 from tasks x where x.tenant_id=m.merchant_tenant_id and x.updated_at>=now()-interval '30 days' and x.deleted_at is null) or exists(select 1 from customer_orders o where o.tenant_id=m.merchant_tenant_id and o.occurred_at>=now()-interval '30 days' and o.deleted_at is null)) or coalesce(s.risk_level,'low')='high'))::int renewal_opportunity_count
         from platform_channel_merchants m
         left join platform_tenant_settings s on s.tenant_id=m.merchant_tenant_id and s.deleted_at is null
         where m.tenant_id=$1 and m.deleted_at is null${channelFilter}`,
        params,
      ),
      this.pool.query(
        `select c.id channel_id,c.code channel_code,c.name channel_name,m.id membership_id,m.merchant_tenant_id,t.slug,t.name,m.onboarding_status,m.service_status,coalesce(s.plan,'starter') plan,coalesce(s.risk_level,'low') risk_level,
          (exists(select 1 from tasks x where x.tenant_id=m.merchant_tenant_id and x.updated_at>=now()-interval '30 days' and x.deleted_at is null) or exists(select 1 from customer_orders o where o.tenant_id=m.merchant_tenant_id and o.occurred_at>=now()-interval '30 days' and o.deleted_at is null)) active_in_30_days
         from platform_channels c
         join platform_channel_merchants m on m.channel_id=c.id and m.tenant_id=c.tenant_id and m.deleted_at is null
         join tenants t on t.id=m.merchant_tenant_id and t.deleted_at is null
         left join platform_tenant_settings s on s.tenant_id=t.id and s.deleted_at is null
         where c.tenant_id=$1 and c.deleted_at is null${channelFilterC}
         order by c.name,t.name`,
        params,
      ),
    ]);
    const merchants = rows.rows.map((row) => {
      const inactive = !row.active_in_30_days;
      const renewalSignal =
        row.onboarding_status === 'active' && (inactive || row.risk_level === 'high')
          ? inactive
            ? 'inactive_30d'
            : 'high_risk'
          : null;
      return {
        channelId: row.channel_id,
        channelCode: row.channel_code,
        channelName: row.channel_name,
        membershipId: row.membership_id,
        tenantId: row.merchant_tenant_id,
        slug: row.slug,
        name: row.name,
        onboardingStatus: row.onboarding_status,
        serviceStatus: row.service_status,
        plan: row.plan,
        riskLevel: row.risk_level,
        activeIn30Days: row.active_in_30_days,
        renewalSignal,
      };
    });
    return { metrics: metrics.rows[0], merchants };
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
