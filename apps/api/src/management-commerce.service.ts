import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createApiPool } from './database-pool';

/**
 * G1-W5: Management PC Order / Review / Marketing read skeletons (MPC-04/05/07).
 *
 * All rows are genuinely DB-backed, tenant-scoped, and (for store managers)
 * store-scope filtered. No fabricated aggregation: pages render real rows with
 * honest empty states. `source`/`delivery_channel`/`status` are surfaced so the
 * UI can label local pilot data vs. a third-party hand-off without ever claiming
 * live Meituan order/review/price sync.
 */
@Injectable()
export class ManagementCommerceService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  // Tenant is always `$1`; a scoped store list (if any) is `$2::uuid[]`.
  private storeFilter(storeIds: string[] | null): { clause: string; params: string[] } {
    return storeIds === null || storeIds.length === 0
      ? { clause: '', params: [] }
      : { clause: 'and store_id = any($2::uuid[])', params: storeIds };
  }

  async listOrders(tenantId: string, storeIds: string[] | null) {
    const { clause, params } = this.storeFilter(storeIds);
    const result = await this.pool.query(
      `select co.id,co.order_number,co.customer_id,c.display_name as customer_name,
              st.id as store_id,st.name as store_name,co.source,co.amount_cents,co.currency,
              co.fulfillment_status,co.status,co.merchant_note,co.occurred_at,co.items
       from customer_orders co
       join stores st on st.id=co.store_id and st.tenant_id=co.tenant_id and st.deleted_at is null
       left join customers c on c.id=co.customer_id and c.tenant_id=co.tenant_id
       where co.tenant_id=$1 and co.deleted_at is null ${clause}
       order by co.occurred_at desc limit 200`,
      [tenantId, ...params],
    );
    return result.rows;
  }

  async listReviews(tenantId: string, storeIds: string[] | null) {
    const { clause, params } = this.storeFilter(storeIds);
    const result = await this.pool.query(
      `select r.id,r.store_id,st.name as store_name,r.rating,r.content,r.reviewer_label,r.source,r.status,r.created_at
       from store_reviews r
       join stores st on st.id=r.store_id and st.tenant_id=r.tenant_id and st.deleted_at is null
       where r.tenant_id=$1 and r.deleted_at is null ${clause}
       order by r.created_at desc limit 200`,
      [tenantId, ...params],
    );
    return result.rows.map((row) => ({
      ...row,
      rating: Number(row.rating),
    }));
  }

  async listMarketing(tenantId: string, storeIds: string[] | null) {
    const { clause, params } = this.storeFilter(storeIds);
    const result = await this.pool.query(
      `select mc.id,mc.store_id,st.name as store_name,mc.offer_id,mc.campaign_type,mc.title,
              mc.description,mc.delivery_channel,mc.starts_at,mc.ends_at,mc.status
       from marketing_campaigns mc
       join stores st on st.id=mc.store_id and st.tenant_id=mc.tenant_id and st.deleted_at is null
       where mc.tenant_id=$1 and mc.deleted_at is null ${clause}
       order by mc.starts_at desc limit 200`,
      [tenantId, ...params],
    );
    return result.rows;
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
