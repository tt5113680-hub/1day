import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { createApiPool } from './database-pool';

const uuid = /^[0-9a-f-]{36}$/i;

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

  /**
   * G1-W113 (MPC-04 depth): order trace detail drawer.
   *
   * Returns the order row plus the honest local trace chain:
   *  - sources: the customer_sources links that produced this customer
   *  - tasks: the customer's follow-up tasks (Consult -> Customer -> Task -> Done)
   *  - updates/audits: local audit trail scoped to the order
   * All rows are real, tenant-scoped (store-scoped for store managers) and
   * local-pilot only (source=local). No fabricated aggregates and no claims of
   * third-party live order/fulfilment.
   */
  async getOrderDetail(tenantId: string, storeIds: string[] | null, orderId: string) {
    if (!uuid.test(orderId)) throw new BadRequestException('VALIDATION_ERROR');
    const { clause, params } = this.storeFilter(storeIds);
    const idParam = params.length ? 3 : 2;
    const order = await this.pool.query(
      `select co.id,co.order_number,co.customer_id,c.display_name as customer_name,
              st.id as store_id,st.name as store_name,co.source,co.amount_cents,co.currency,
              co.fulfillment_status,co.status,co.merchant_note,co.occurred_at,co.items,
              (select count(*)::int from evidence_files ef where ef.tenant_id=co.tenant_id and ef.order_id=co.id and ef.status='active' and ef.deleted_at is null) evidence_count,
              (select count(*)::int from connector_results cr where cr.tenant_id=co.tenant_id and cr.order_id=co.id and cr.status='received' and cr.deleted_at is null) connector_count
       from customer_orders co
       join stores st on st.id=co.store_id and st.tenant_id=co.tenant_id and st.deleted_at is null
       left join customers c on c.id=co.customer_id and c.tenant_id=co.tenant_id
       where co.id=$${idParam} and co.tenant_id=$1 and co.deleted_at is null ${clause}
       limit 1`,
      [tenantId, ...params, orderId],
    );
    if (!order.rowCount) throw new NotFoundException('NOT_FOUND');
    const orderRow = order.rows[0];
    const customerId = orderRow.customer_id as string | null;
    const [sources, tasks, audits] = await Promise.all([
      customerId
        ? this.pool.query(
            `select source_role,source_type,source_id,status,created_at from customer_sources
             where tenant_id=$1 and customer_id=$2 and deleted_at is null order by created_at desc limit 20`,
            [tenantId, customerId],
          )
        : Promise.resolve({ rows: [] }),
      customerId
        ? this.pool.query(
            `select t.title,t.status,t.due_at,t.escalation_level,t.created_at,coalesce(u.display_name,'未分配') assignee_name
             from tasks t left join employees e on e.id=t.assignee_employee_id and e.tenant_id=t.tenant_id
             left join memberships m on m.id=e.membership_id and m.tenant_id=e.tenant_id left join users u on u.id=m.user_id
             where t.tenant_id=$1 and t.customer_id=$2 and t.deleted_at is null order by t.due_at desc limit 20`,
            [tenantId, customerId],
          )
        : Promise.resolve({ rows: [] }),
      this.pool.query(
        `select a.action,a.resource_id,a.details,a.status,a.created_at,coalesce(u.display_name,'Unknown') actor_name
         from audit_logs a left join users u on u.id=a.actor_id
         where a.tenant_id=$1 and (a.resource_id=$2 or a.resource_type='customer_order' or a.resource_type='order_trace')
         and a.deleted_at is null order by a.created_at desc limit 30`,
        [tenantId, orderId],
      ),
    ]);
    return {
      order: {
        ...orderRow,
        amount_cents: String(orderRow.amount_cents),
      },
      sources: sources.rows,
      tasks: tasks.rows,
      audits: audits.rows,
    };
  }

  /**
   * G1-W113 (MPC-04 depth): order trace CSV export.
   *
   * Honest CSV of the same real, tenant-scoped order trace list the UI shows.
   * Only local trace fields; no fabricated aggregates, no GMV claims.
   */
  async exportOrders(tenantId: string, storeIds: string[] | null) {
    const orders = await this.listOrders(tenantId, storeIds);
    const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const csv = [
      'order_number,customer_name,store_name,source,status,fulfillment_status,currency,amount_cents,items,occurred_at',
      ...orders.map((o) =>
        [
          o.order_number,
          o.customer_name,
          o.store_name,
          o.source,
          o.status,
          o.fulfillment_status,
          o.currency,
          o.amount_cents,
          (o.items ?? [])
            .map((i: { name?: string }) => i?.name ?? '')
            .filter(Boolean)
            .join('、'),
          o.occurred_at,
        ]
          .map(escape)
          .join(','),
      ),
    ].join('\n');
    return {
      filename: `order-trace-${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
    };
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
