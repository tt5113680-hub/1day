import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createApiPool } from './database-pool';

@Injectable()
export class CircleDashboardService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  async overview(platformTenantId: string, circleIds: string[] | null = null) {
    const scoped = circleIds !== null;
    const circleIdFilter = scoped ? ' and id = any($2::uuid[])' : '';
    const circleAliasFilter = scoped ? ' and c.id = any($2::uuid[])' : '';
    const merchantCircleFilter = scoped ? ' and circle_id = any($2::uuid[])' : '';
    const params = scoped ? [platformTenantId, circleIds] : [platformTenantId];
    const [metrics, circles] = await Promise.all([
      this.pool.query(
        `select
          (select count(*)::int from platform_business_circles where tenant_id=$1 and deleted_at is null${circleIdFilter}) circle_count,
          (select count(*)::int from platform_business_circle_merchants where tenant_id=$1 and approval_status='approved' and deleted_at is null${merchantCircleFilter}) merchant_count,
          (select count(*)::int from consumer_action_events e where e.deleted_at is null and e.tenant_id in (select merchant_tenant_id from platform_business_circle_merchants where tenant_id=$1 and approval_status='approved' and deleted_at is null${merchantCircleFilter})) traffic_events,
          (select count(*)::int from customer_orders o where o.status='active' and o.deleted_at is null and o.tenant_id in (select merchant_tenant_id from platform_business_circle_merchants where tenant_id=$1 and approval_status='approved' and deleted_at is null${merchantCircleFilter})) conversion_orders`,
        params,
      ),
      this.pool.query(
        `select c.id,c.code,c.name,c.description,
          coalesce(json_agg(json_build_object(
            'merchantTenantId',m.merchant_tenant_id,'name',t.name,'slug',t.slug,'benefits',m.benefits,
            'contentCount',(select count(*)::int from content_items i where i.tenant_id=m.merchant_tenant_id and i.status='approved' and i.deleted_at is null),
            'trafficEvents',(select count(*)::int from consumer_action_events e where e.tenant_id=m.merchant_tenant_id and e.deleted_at is null),
            'conversionOrders',(select count(*)::int from customer_orders o where o.tenant_id=m.merchant_tenant_id and o.status='active' and o.deleted_at is null)
          ) order by coalesce((m.display_config->>'sortOrder')::int,0),t.name) filter(where m.id is not null),'[]') merchants
         from platform_business_circles c
         left join platform_business_circle_merchants m on m.circle_id=c.id and m.tenant_id=c.tenant_id and m.approval_status='approved' and coalesce((m.display_config->>'visible')::boolean,true) and m.deleted_at is null
         left join tenants t on t.id=m.merchant_tenant_id and t.deleted_at is null
         where c.tenant_id=$1 and c.deleted_at is null${circleAliasFilter} group by c.id order by c.created_at desc`,
        params,
      ),
    ]);
    const circleList = circles.rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      merchants: row.merchants,
    }));
    const merchantQueue = circleList
      .flatMap((circle) =>
        (
          circle.merchants as Array<{
            merchantTenantId: string;
            name: string;
            slug: string;
            trafficEvents: number;
            conversionOrders: number;
          }>
        ).map((merchant) => ({
          circleId: circle.id,
          circleName: circle.name,
          tenantId: merchant.merchantTenantId,
          name: merchant.name,
          slug: merchant.slug,
          trafficEvents: merchant.trafficEvents,
          conversionOrders: merchant.conversionOrders,
          deepLink: `/bc/merchants?tenant=${merchant.merchantTenantId}`,
        })),
      )
      .filter((m) => m.trafficEvents > 0 && m.conversionOrders === 0)
      .sort((a, b) => b.trafficEvents - a.trafficEvents)
      .slice(0, 8);
    return {
      metrics: metrics.rows[0],
      circles: circleList,
      queues: { trafficWithoutConversion: merchantQueue },
    };
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
