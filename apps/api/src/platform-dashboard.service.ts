import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createApiPool } from './database-pool';

@Injectable()
export class PlatformDashboardService implements OnModuleDestroy {
  private readonly pool = createApiPool();
  async overview() {
    const [metrics, risks, health, tenants, channels, deadLetters, signals, provisioning] =
      await Promise.all([
        this.pool.query(`select
        (select count(*)::int from tenants where status='active' and deleted_at is null) tenants,
        (select count(distinct platform)::int from external_actions where status='active' and deleted_at is null and platform is not null) channels,
        (select count(*)::int from tenants t where t.status='active' and t.deleted_at is null and (exists(select 1 from tasks x where x.tenant_id=t.id and x.updated_at>=now()-interval '30 days') or exists(select 1 from customer_orders o where o.tenant_id=t.id and o.occurred_at>=now()-interval '30 days'))) active_tenants,
        (select count(*)::int from outbox_events where status='pending' and deleted_at is null) pending_events`),
        this.pool.query(`select type,count(*)::int count from (
        select 'overdue_task' type from tasks where status='overdue' and deleted_at is null
        union all select 'ownership_approval' from customer_ownership_transfer_approvals where status='pending' and deleted_at is null
        union all select 'connector_attention' from connector_configs where status not in ('authorized','pending_authorization') and deleted_at is null
      ) risk group by type order by type`),
        this.pool.query('select now() checked_at, current_database() database_name'),
        this.pool
          .query(`select t.status, coalesce(s.plan,'starter') plan, coalesce(s.risk_level,'low') risk_level
        from tenants t left join platform_tenant_settings s on s.tenant_id=t.id and s.deleted_at is null
        where t.deleted_at is null order by t.created_at`),
        this.pool.query(`select coalesce(platform,'(未指定)') platform, status
        from external_actions where deleted_at is null order by created_at`),
        this.pool.query(`select event_type, aggregate_type, attempts, tenant_id
        from outbox_events where status='needs_attention' and deleted_at is null
        order by updated_at desc limit 100`),
        this.pool.query(`select event_code as key, count(*)::int as count
        from entry_funnel_events
        where occurred_at >= now() - interval '30 days'
        group by event_code order by count desc`),
        this.pool.query(
          `select r.id,r.tenant_id,r.state,r.request_slug,r.updated_at,r.error_code,
                (select count(*)::int from tenant_provisioning_steps s where s.run_id=r.id and s.state='failed' and s.deleted_at is null) failed_steps
         from tenant_provisioning_runs r
         where r.deleted_at is null and r.state not in ('ready','draft')
         order by r.updated_at desc limit 8`,
        ),
      ]);
    return {
      metrics: {
        tenants: metrics.rows[0].tenants,
        channels: metrics.rows[0].channels,
        activeTenants: metrics.rows[0].active_tenants,
        pendingEvents: metrics.rows[0].pending_events,
      },
      risks: risks.rows.map((row) => ({ type: row.type, count: row.count })),
      tenants: tenants.rows.map((row) => ({
        status: row.status,
        plan: row.plan,
        riskLevel: row.risk_level,
      })),
      channels: channels.rows.map((row) => ({ platform: row.platform, status: row.status })),
      outbox: deadLetters.rows.map((row) => ({
        eventType: row.event_type,
        aggregateType: row.aggregate_type,
        attempts: row.attempts,
        tenantId: row.tenant_id,
      })),
      signals: signals.rows.map((row) => ({ key: row.key, count: Number(row.count) })),
      provisioningRuns: provisioning.rows.map((row) => ({
        id: row.id,
        tenantId: row.tenant_id,
        state: row.state,
        requestSlug: row.request_slug,
        updatedAt: row.updated_at,
        errorCode: row.error_code,
        failedSteps: row.failed_steps,
        deepLink: `/p/tenants/new?run=${row.id}`,
      })),
      system: {
        database: 'available',
        checkedAt: health.rows[0].checked_at,
        databaseName: health.rows[0].database_name,
      },
    };
  }
  async onModuleDestroy() {
    await this.pool.end();
  }
}
