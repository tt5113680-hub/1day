import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';

const uuid = /^[0-9a-f-]{36}$/i;

/** Archive source tags only — not a live third-party review stream. */
const REVIEW_SOURCES = [
  'local',
  'import_meituan',
  'import_dianping',
  'import_douyin',
  'manual',
] as const;

const REVIEW_SOURCE_LABELS: Record<(typeof REVIEW_SOURCES)[number], string> = {
  local: '本地登记',
  import_meituan: '导入·美团',
  import_dianping: '导入·点评',
  import_douyin: '导入·抖音',
  manual: '人工补录',
};

/**
 * G1-W5: Management PC Order / Review / Marketing read skeletons (MPC-04/05/07).
 *
 * All rows are genuinely DB-backed, tenant-scoped, and (for store managers)
 * store-scope filtered. No fabricated aggregation: pages render real rows with
 * honest empty states. `source`/`delivery_channel`/`status` are surfaced so the
 * UI can label local pilot data vs. a third-party hand-off without ever claiming
 * live Meituan order/review/price sync.
 *
 * W∞-134 — §2 reviews densify: multi-platform source tags + rating trend from
 * real `store_reviews` rows (archive labels only; no live Meituan stream).
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

  /**
   * G1-W∞-114 (MPC-05): evaluation archive list, optionally filtered by reply state.
   *
   * Real, tenant-scoped (store-scoped for store managers) `store_reviews` rows plus
   * the honest local reply trace (`reply_text`/`reply_status`/`replied_at`/`replied_by_name`).
   * `reply` filter = pending (no reply yet) / replied / all. `rating` narrows by star.
   * W∞-134: optional `source` filter for multi-platform archive tags.
   * No third-party review stream is ever claimed; no fabricated rating aggregates.
   */
  async listReviews(
    tenantId: string,
    storeIds: string[] | null,
    reply = 'all',
    rating?: number,
    source?: string,
  ) {
    if (!['all', 'pending', 'replied'].includes(reply))
      throw new BadRequestException('VALIDATION_ERROR');
    if (source !== undefined && !(REVIEW_SOURCES as readonly string[]).includes(source))
      throw new BadRequestException('VALIDATION_ERROR');
    const { clause, params } = this.storeFilter(storeIds);
    const filters: string[] = [];
    const values: (string | number | string[])[] = [tenantId, ...params];
    if (reply === 'pending') filters.push('r.replied_at is null');
    if (reply === 'replied') filters.push('r.replied_at is not null');
    if (rating !== undefined) {
      values.push(rating);
      filters.push(`r.rating=$${values.length}`);
    }
    if (source !== undefined) {
      values.push(source);
      filters.push(`r.source=$${values.length}`);
    }
    const result = await this.pool.query(
      `select r.id,r.store_id,st.name as store_name,r.rating,r.content,r.reviewer_label,r.source,r.status,
              r.reply_text,r.replied_at,coalesce(u.display_name,'未知操作人') as replied_by_name,
              case when r.replied_at is null then 'pending' else 'replied' end as reply_status,r.created_at
       from store_reviews r
       join stores st on st.id=r.store_id and st.tenant_id=r.tenant_id and st.deleted_at is null
       left join users u on u.id=r.replied_by
       where r.tenant_id=$1 and r.deleted_at is null ${clause}${filters.length ? ' and ' + filters.join(' and ') : ''}
       order by r.replied_at is not null, r.created_at desc limit 200`,
      values,
    );
    return result.rows.map((row) => ({
      ...row,
      rating: Number(row.rating),
      sourceLabel:
        REVIEW_SOURCE_LABELS[row.source as (typeof REVIEW_SOURCES)[number]] ?? String(row.source),
    }));
  }

  /**
   * W∞-134 — §2 reviews densify: multi-platform source tags + daily rating trend.
   *
   * Aggregates real `store_reviews` only. Source values are archive tags (local /
   * import_* / manual); never claimed as a live Meituan/Dianping/Douyin stream.
   * `ratingTrend` is day buckets over the requested window; empty days omitted.
   */
  async reviewInsights(tenantId: string, storeIds: string[] | null, days = 30) {
    if (![7, 14, 30, 90].includes(days)) throw new BadRequestException('VALIDATION_ERROR');
    const storeClause =
      storeIds === null || storeIds.length === 0 ? '' : 'and r.store_id = any($2::uuid[])';
    const dayIdx = storeIds === null || storeIds.length === 0 ? 2 : 3;
    const values: (string | number | string[])[] =
      storeIds === null || storeIds.length === 0
        ? [tenantId, days]
        : [tenantId, storeIds, days];
    const window = `and r.created_at >= now() - ($${dayIdx}::text || ' days')::interval`;
    const [bySourceRows, trendRows] = await Promise.all([
      this.pool.query(
        `select r.source,
                count(*)::int as total,
                count(*) filter (where r.replied_at is null)::int as pending,
                coalesce(round(avg(r.rating)::numeric, 1), 0) as avg_rating
         from store_reviews r
         join stores st on st.id=r.store_id and st.tenant_id=r.tenant_id and st.deleted_at is null
         where r.tenant_id=$1 and r.deleted_at is null ${storeClause} ${window}
         group by r.source
         order by total desc, r.source asc`,
        values,
      ),
      this.pool.query(
        `select to_char(date_trunc('day', r.created_at), 'YYYY-MM-DD') as day,
                count(*)::int as count,
                coalesce(round(avg(r.rating)::numeric, 1), 0) as avg_rating
         from store_reviews r
         join stores st on st.id=r.store_id and st.tenant_id=r.tenant_id and st.deleted_at is null
         where r.tenant_id=$1 and r.deleted_at is null ${storeClause} ${window}
         group by 1
         order by 1 asc`,
        values,
      ),
    ]);
    const bySource = bySourceRows.rows.map((row) => ({
      source: String(row.source),
      label:
        REVIEW_SOURCE_LABELS[row.source as (typeof REVIEW_SOURCES)[number]] ?? String(row.source),
      total: Number(row.total),
      pending: Number(row.pending),
      avgRating: Number(row.avg_rating),
    }));
    const ratingTrend = trendRows.rows.map((row) => ({
      day: String(row.day),
      count: Number(row.count),
      avgRating: Number(row.avg_rating),
    }));
    return {
      days,
      bySource,
      ratingTrend,
      knownSources: REVIEW_SOURCES.map((source) => ({
        source,
        label: REVIEW_SOURCE_LABELS[source],
      })),
      disclaimer:
        '多平台标签与评分趋势均来自本地 store_reviews 档案；source 仅为导入/登记标签，不接美团/点评/抖音实时评价流，不伪造第三方评分。',
    };
  }

  /**
   * W∞-114 — resolve a review's owning store (for scoped store-manager write gating).
   * Returns null when the review does not exist in the tenant (treated as NOT_FOUND).
   */
  async reviewStoreId(tenantId: string, reviewId: string) {
    if (!uuid.test(reviewId)) return null;
    const row = (
      await this.pool.query(
        'select store_id from store_reviews where id=$1 and tenant_id=$2 and deleted_at is null',
        [reviewId, tenantId],
      )
    ).rows[0];
    return row?.store_id ? String(row.store_id) : null;
  }

  /**
   * G1-W∞-114 (MPC-05): reply-state queue summary mined from real `store_reviews` rows.
   *
   * Returns honest pending/replied counts, overall average rating and a per-rating
   * pending breakdown. The `pendingQueue` is the actionable 待回复队列 (reviews with no
   * reply yet). No fabricated metrics and no claims about third-party live evaluation.
   */
  async reviewQueue(tenantId: string, storeIds: string[] | null) {
    const { clause, params } = this.storeFilter(storeIds);
    const rows = await this.pool.query(
      `select r.id,r.store_id,st.name as store_name,r.rating,r.content,r.reviewer_label,r.source,r.status,
              r.reply_text,r.replied_at,coalesce(u.display_name,'未知操作人') as replied_by_name,
              case when r.replied_at is null then 'pending' else 'replied' end as reply_status,r.created_at
       from store_reviews r
       join stores st on st.id=r.store_id and st.tenant_id=r.tenant_id and st.deleted_at is null
       left join users u on u.id=r.replied_by
       where r.tenant_id=$1 and r.deleted_at is null ${clause}
       order by case when r.replied_at is null then 0 else 1 end, r.created_at desc limit 500`,
      [tenantId, ...params],
    );
    const all = rows.rows.map((row) => ({
      ...row,
      rating: Number(row.rating),
    }));
    const pending = all.filter((row) => row.reply_status === 'pending');
    const total = all.length;
    const pendingCount = pending.length;
    const repliedCount = total - pendingCount;
    const sum = all.reduce((acc, row) => acc + row.rating, 0);
    const avgRating = total ? Number((sum / total).toFixed(1)) : 0;
    const byRating = [5, 4, 3, 2, 1].map((star) => ({
      rating: star,
      total: all.filter((row) => row.rating === star).length,
      pending: pending.filter((row) => row.rating === star).length,
    }));
    return {
      total,
      pending: pendingCount,
      replied: repliedCount,
      replyRate: total ? pendingCount / total : 0,
      avgRating,
      byRating,
      pendingQueue: pending.slice(0, 50),
    };
  }

  /**
   * G1-W∞-114 (MPC-05): record a reply on one local evaluation archive row.
   *
   * Write gated by tenant + store scope in the controller. Idempotent via
   * Idempotency-Key and writes honest reply trail + local audit/outbox. Does not push
   * to any third-party review stream and does not fabricate a live evaluation reply.
   */
  async replyToReview(
    context: OrganizationContext,
    reviewId: string,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    if (!uuid.test(reviewId)) throw new BadRequestException('VALIDATION_ERROR');
    if (!key.trim() || key.length > 160) throw new BadRequestException('VALIDATION_ERROR');
    const replyText = body.replyText;
    if (typeof replyText !== 'string' || !replyText.trim() || replyText.trim().length > 1000)
      throw new BadRequestException('VALIDATION_ERROR');

    return this.withIdempotency(context, 'reviews_reply', key, async (client) => {
      const review = await client.query(
        `select id,store_id from store_reviews where id=$1 and tenant_id=$2 and deleted_at is null limit 1`,
        [reviewId, context.tenantId],
      );
      if (!review.rowCount) throw new NotFoundException('NOT_FOUND');
      const updated = await client.query(
        `update store_reviews set reply_text=$1,replied_by=$2,replied_at=now(),updated_at=now(),updated_by=$2,version=version+1
         where id=$3 and tenant_id=$4 and deleted_at is null
         returning id,store_id,reply_text,replied_at,version`,
        [replyText.trim(), context.userId, reviewId, context.tenantId],
      );
      if (!updated.rowCount) throw new ConflictException('CONFLICT');
      await this.reviewReceipt(
        client,
        context,
        'reviews.replied',
        'reviews.replied.v1',
        reviewId,
        requestId,
        { replyText: replyText.trim(), replyStatus: 'replied' },
      );
      return { id: reviewId, replyStatus: 'replied' };
    });
  }

  private async reviewReceipt(
    client: PoolClient,
    context: OrganizationContext,
    action: string,
    eventType: string,
    id: string,
    requestId: string,
    details: unknown,
  ) {
    const correlationId = uuid.test(requestId) ? requestId : randomUUID();
    await client.query(
      "insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,$4,'store_review',$5,$6,'page-m-005',$7,$3,$3)",
      [randomUUID(), context.tenantId, context.userId, action, id, correlationId, details],
    );
    await client.query(
      "insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,$3,'store_review',$4,$5,$6,'page-m-005',$7,$7)",
      [randomUUID(), context.tenantId, eventType, id, details, correlationId, context.userId],
    );
  }

  private async withIdempotency(
    context: OrganizationContext,
    type: string,
    key: string,
    action: (client: PoolClient) => Promise<Record<string, unknown>>,
  ) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      await client.query('select pg_advisory_xact_lock(hashtext($1),hashtext($2))', [
        context.tenantId,
        `${type}:${key}`,
      ]);
      const existing = await client.query(
        'select response from idempotency_keys where tenant_id=$1 and resource_type=$2 and idempotency_key=$3',
        [context.tenantId, type, key],
      );
      if (existing.rowCount) {
        await client.query('commit');
        return existing.rows[0].response as Record<string, unknown>;
      }
      const data = await action(client);
      await client.query(
        'insert into idempotency_keys(id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6)',
        [randomUUID(), context.tenantId, type, key, data, context.userId],
      );
      await client.query('commit');
      return data;
    } catch (error) {
      await client.query('rollback');
      if ((error as { code?: string }).code === '23505') throw new ConflictException('CONFLICT');
      throw error;
    } finally {
      client.release();
    }
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
