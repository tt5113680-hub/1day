import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class CircleDashboardService implements OnModuleDestroy {
  private readonly pool = new Pool({ connectionString: process.env.DATABASE_URL });

  async overview(platformTenantId: string) {
    const [metrics, circles] = await Promise.all([
      this.pool.query(
        `select
          (select count(*)::int from platform_business_circles c where c.tenant_id=$1 and c.deleted_at is null) circle_count,
          (select count(*)::int from platform_business_circle_merchants m where m.tenant_id=$1 and m.approval_status='approved' and m.deleted_at is null) merchant_count,
          (select count(*)::int from consumer_action_events e where e.deleted_at is null and e.tenant_id in (select merchant_tenant_id from platform_business_circle_merchants where tenant_id=$1 and approval_status='approved' and deleted_at is null)) traffic_events,
          (select count(*)::int from customer_orders o where o.status='active' and o.deleted_at is null and o.tenant_id in (select merchant_tenant_id from platform_business_circle_merchants where tenant_id=$1 and approval_status='approved' and deleted_at is null)) conversion_orders`,
        [platformTenantId],
      ),
      this.pool.query(
        `select c.id,c.code,c.name,c.description,
          coalesce(json_agg(json_build_object(
            'merchantTenantId',m.merchant_tenant_id,'name',t.name,'slug',t.slug,'benefits',m.benefits,
            'contentCount',(select count(*)::int from content_items i where i.tenant_id=m.merchant_tenant_id and i.status='approved' and i.deleted_at is null),
            'trafficEvents',(select count(*)::int from consumer_action_events e where e.tenant_id=m.merchant_tenant_id and e.deleted_at is null),
            'conversionOrders',(select count(*)::int from customer_orders o where o.tenant_id=m.merchant_tenant_id and o.status='active' and o.deleted_at is null)
          ) order by t.name) filter(where m.id is not null),'[]') merchants
         from platform_business_circles c
         left join platform_business_circle_merchants m on m.circle_id=c.id and m.tenant_id=c.tenant_id and m.approval_status='approved' and m.deleted_at is null
         left join tenants t on t.id=m.merchant_tenant_id and t.deleted_at is null
         where c.tenant_id=$1 and c.deleted_at is null group by c.id order by c.created_at desc`,
        [platformTenantId],
      ),
    ]);
    return {
      metrics: metrics.rows[0],
      circles: circles.rows.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description,
        merchants: row.merchants,
      })),
    };
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
