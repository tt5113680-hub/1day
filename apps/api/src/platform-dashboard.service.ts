import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class PlatformDashboardService implements OnModuleDestroy {
  private readonly pool = new Pool({ connectionString: process.env.DATABASE_URL });
  async overview() {
    const [metrics, risks, health] = await Promise.all([
      this.pool.query(`select
        (select count(*)::int from tenants where status='active' and deleted_at is null) tenants,
        (select count(distinct platform)::int from external_actions where status='active' and deleted_at is null and platform is not null) channels,
        (select count(*)::int from tenants t where t.status='active' and t.deleted_at is null and exists(select 1 from tasks x where x.tenant_id=t.id and x.updated_at>=now()-interval '30 days') or exists(select 1 from customer_orders o where o.tenant_id=t.id and o.occurred_at>=now()-interval '30 days')) active_tenants,
        (select count(*)::int from outbox_events where status='pending' and deleted_at is null) pending_events`),
      this.pool.query(`select type,count(*)::int count from (
        select 'overdue_task' type from tasks where status='overdue' and deleted_at is null
        union all select 'ownership_approval' from customer_ownership_transfer_approvals where status='pending' and deleted_at is null
        union all select 'connector_attention' from connector_configs where status not in ('authorized','pending_authorization') and deleted_at is null
      ) risk group by type order by type`),
      this.pool.query('select now() checked_at, current_database() database_name'),
    ]);
    return {
      metrics: {
        tenants: metrics.rows[0].tenants,
        channels: metrics.rows[0].channels,
        activeTenants: metrics.rows[0].active_tenants,
        pendingEvents: metrics.rows[0].pending_events,
      },
      risks: risks.rows.map((row) => ({ type: row.type, count: row.count })),
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
