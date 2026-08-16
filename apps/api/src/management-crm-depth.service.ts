import { BadRequestException, Injectable, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { type Pool, type PoolClient } from 'pg';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';

const uuid = /^[0-9a-f-]{36}$/i;
const RFM_WINDOW_DAYS = 90;
const text = (value: unknown, max: number) =>
  value === undefined || value === ''
    ? null
    : typeof value === 'string' && value.trim().length <= max
      ? value.trim()
      : (() => {
          throw new BadRequestException('VALIDATION_ERROR');
        })();

/**
 * W∞-109 — CRM 深操作：RFM 自动分层 + 批量打标/归属（MPC-06 / Phase1 1.4）。
 * W∞-132 — §2 收口：cohort + 复购周期 + 沉睡唤醒队列。
 *
 * RFM 由真实客户关联互动数据现场计算并落库到 `customer_rfm_profiles`，禁止假分层：
 *  - R = 最近互动天数（距最近一次 task_follow_up / nurture_touchpoint / customer_order 痕迹）
 *  - F = 互动频次（回看窗口 RFM_WINDOW_DAYS 天内上述互动记录数）
 *  - M = 触达覆盖（去重触达通道数：来源 + 贡献 + 证据，非资金/非成交额）
 *
 * 派生 `layer`（高价值-活跃 / 温和互动 / 需唤醒 / 沉睡）作为列表筛选 / 分布 / 详细单一真源。
 * 诚实边界：F/R/M 仅统计入口、跟进与痕迹，不含支付金额、不含第三方成交、非本平台下单。
 *
 * 批量打标：`POST /tags/batch` 在选定的客户上新增/移除标签，写入 audit + outbox。
 */
@Injectable()
export class ManagementCrmDepthService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  async computeRfm(context: OrganizationContext, requestId: string) {
    const rows = await this.pool.query(
      `with customer_interactions as (
         select
           c.id as customer_id,
           c.created_at as customer_created_at,
           greatest(
             coalesce((select max(f.created_at) from task_follow_ups f join tasks ft on ft.id=f.task_id where ft.tenant_id=c.tenant_id and ft.customer_id=c.id and f.deleted_at is null and ft.deleted_at is null), '-infinity'::timestamptz),
             coalesce((select max(tp.occurred_at) from employee_nurture_touchpoints tp join employee_nurture_profiles p on p.id=tp.profile_id where tp.tenant_id=c.tenant_id and tp.customer_id=c.id and tp.deleted_at is null and p.deleted_at is null), '-infinity'::timestamptz),
             coalesce((select max(o.occurred_at) from customer_orders o where o.tenant_id=c.tenant_id and o.customer_id=c.id and o.deleted_at is null), '-infinity'::timestamptz)
           ) as last_interaction,
           ((select count(*) from task_follow_ups f2 join tasks ft2 on ft2.id=f2.task_id where ft2.tenant_id=c.tenant_id and ft2.customer_id=c.id and f2.deleted_at is null and ft2.deleted_at is null and f2.created_at >= now()-make_interval(days => ${RFM_WINDOW_DAYS}))::int
           + (select count(*) from employee_nurture_touchpoints tp2 join employee_nurture_profiles p2 on p2.id=tp2.profile_id where tp2.tenant_id=c.tenant_id and tp2.customer_id=c.id and tp2.deleted_at is null and p2.deleted_at is null and tp2.occurred_at >= now()-make_interval(days => ${RFM_WINDOW_DAYS}))::int
           + (select count(*) from customer_orders o2 where o2.tenant_id=c.tenant_id and o2.customer_id=c.id and o2.deleted_at is null and o2.occurred_at >= now()-make_interval(days => ${RFM_WINDOW_DAYS}))::int) as frequency_count,
           ((select count(distinct s.id)::int from customer_sources s where s.tenant_id=c.tenant_id and s.customer_id=c.id and s.status='active' and s.deleted_at is null)
           + (select count(distinct ct.id)::int from customer_contributions ct where ct.tenant_id=c.tenant_id and ct.customer_id=c.id and ct.status='active' and ct.deleted_at is null)
           + (select count(*)::int from evidence_files ef join customer_orders co on co.id=ef.order_id where co.tenant_id=c.tenant_id and co.customer_id=c.id and ef.status='active' and ef.deleted_at is null)) as reach_count
         from customers c
         where c.tenant_id=$1 and c.status='active' and c.deleted_at is null
       )
       select
         ci.customer_id,
         case when ci.last_interaction > '-infinity'::timestamptz then greatest(0, extract(epoch from (now()-ci.last_interaction))/86400)::int else null end as recency_days,
         ci.frequency_count,
         ci.reach_count,
         $2::int as window_days
       from customer_interactions ci`,
      [context.tenantId, RFM_WINDOW_DAYS],
    );
    const client = await this.pool.connect();
    let upserted = 0;
    try {
      await client.query('begin');
      for (const row of rows.rows) {
        const layer = this.deriveLayer(row.recency_days, row.frequency_count);
        await client.query(
          `insert into customer_rfm_profiles(id,tenant_id,customer_id,recency_days,frequency_count,reach_count,layer,window_days,computed_at,created_by,updated_by)
           values($1,$2,$3,$4,$5,$6,$7,$8,now(),$9,$9)
           on conflict (tenant_id,customer_id)
           do update set recency_days=excluded.recency_days,frequency_count=excluded.frequency_count,
             reach_count=excluded.reach_count,layer=excluded.layer,window_days=excluded.window_days,
             computed_at=now(),updated_at=now(),updated_by=excluded.updated_by,deleted_at=null,version=customer_rfm_profiles.version+1`,
          [
            randomUUID(),
            context.tenantId,
            row.customer_id,
            row.recency_days,
            row.frequency_count,
            row.reach_count,
            layer,
            row.window_days,
            context.userId,
          ],
        );
        upserted += 1;
      }
      await this.record(client, context, 'customer.rfm_computed', context.tenantId, requestId, {
        customers: rows.rowCount,
        windowDays: RFM_WINDOW_DAYS,
        layer: 'auto',
      });
      const outboxEvent = context.tenantId;
      await client.query(
        `insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by)
         values($1,$2,$3,'customer_rfm_tenant',$4,$5,$6,'page-m-003',$7,$7)`,
        [
          randomUUID(),
          context.tenantId,
          'customer.rfm.computed.v1',
          outboxEvent,
          { customers: rows.rowCount, windowDays: RFM_WINDOW_DAYS },
          uuid.test(requestId) ? requestId : randomUUID(),
          context.userId,
        ],
      );
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
    const summary = await this.summary(context.tenantId);
    return { windowDays: RFM_WINDOW_DAYS, computed: upserted, ...summary };
  }

  async batchTag(
    context: OrganizationContext,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    if (!key.trim() || key.length > 160) throw new BadRequestException('VALIDATION_ERROR');
    const action = text(body.action, 16);
    const label = text(body.label, 80);
    if (
      !action ||
      !label ||
      (action !== 'add' && action !== 'remove') ||
      !Array.isArray(body.customerIds) ||
      body.customerIds.length < 1 ||
      body.customerIds.length > 200
    )
      throw new BadRequestException('VALIDATION_ERROR');
    const customerIds = body.customerIds.map((value) => {
      const id = text(value, 36);
      if (!id || !uuid.test(id)) throw new BadRequestException('VALIDATION_ERROR');
      return id;
    });
    const client = await this.pool.connect();
    let applied = 0;
    try {
      await client.query('begin');
      for (const customerId of customerIds) {
        if (action === 'add') {
          await client.query(
            `insert into customer_tags(id,tenant_id,customer_id,label,created_by,updated_by)
             values($1,$2,$3,$4,$5,$5)
             on conflict (tenant_id,customer_id,label)
             do update set deleted_at=null,updated_at=now(),updated_by=excluded.updated_by,version=customer_tags.version+1`,
            [randomUUID(), context.tenantId, customerId, label, context.userId],
          );
        } else {
          await client.query(
            `update customer_tags set deleted_at=now(),updated_at=now(),updated_by=$1,version=version+1
             where tenant_id=$2 and customer_id=$3 and label=$4 and deleted_at is null`,
            [context.userId, context.tenantId, customerId, label],
          );
        }
        applied += 1;
      }
      await this.record(client, context, 'customer.tags_batch', context.tenantId, requestId, {
        action,
        label,
        customers: customerIds.length,
      });
      await client.query(
        `insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by)
         values($1,$2,$3,'customer_tags',$4,$5,$6,'page-m-003',$7,$7)`,
        [
          randomUUID(),
          context.tenantId,
          'customer.tags.batch.v1',
          context.tenantId,
          { action, label, customers: customerIds.length },
          uuid.test(requestId) ? requestId : randomUUID(),
          context.userId,
        ],
      );
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
    return { action, label, applied };
  }

  async summary(tenantId: string) {
    const rows = await this.pool.query(
      'select layer, count(*)::int as c from customer_rfm_profiles where tenant_id=$1 and deleted_at is null group by layer',
      [tenantId],
    );
    const byLayer: Record<string, number> = {};
    for (const row of rows.rows) byLayer[row.layer] = row.c;
    const total = rows.rows.reduce((sum, row) => sum + row.c, 0);
    const dormant = byLayer['沉睡'] ?? 0;
    return { total, layers: byLayer, dormant };
  }

  /**
   * W∞-132 — §2 目标深度收口：cohort + 复购周期 + 沉睡唤醒队列。
   * 全部由真实建档日 / 互动痕迹 / RFM 分层现场推导；不含支付金额与第三方成交。
   */
  async retentionDepth(context: OrganizationContext, monthsRaw: string | undefined) {
    const months = Math.min(12, Math.max(3, Number.parseInt(monthsRaw ?? '6', 10) || 6));
    const [cohort, repurchase, dormantQueue, summary] = await Promise.all([
      this.cohort(context.tenantId, months),
      this.repurchaseCycle(context.tenantId),
      this.dormantQueue(context.tenantId),
      this.summary(context.tenantId),
    ]);
    return {
      months,
      cohort,
      repurchaseCycle: repurchase,
      dormantQueue,
      rfm: summary,
      disclaimer:
        'cohort/复购/唤醒队列均由本地互动档案与 RFM 分层推导；不含支付金额、非本平台下单、不代表第三方成交。',
    };
  }

  async wakeDormant(
    context: OrganizationContext,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    if (!key.trim() || key.length > 160) throw new BadRequestException('VALIDATION_ERROR');
    if (
      !Array.isArray(body.customerIds) ||
      body.customerIds.length < 1 ||
      body.customerIds.length > 100
    )
      throw new BadRequestException('VALIDATION_ERROR');
    const customerIds = body.customerIds.map((value) => {
      const id = text(value, 36);
      if (!id || !uuid.test(id)) throw new BadRequestException('VALIDATION_ERROR');
      return id;
    });
    const label = '沉睡唤醒';
    const client = await this.pool.connect();
    let applied = 0;
    try {
      await client.query('begin');
      const eligible = await client.query(
        `select c.id
         from customers c
         join customer_rfm_profiles r on r.tenant_id=c.tenant_id and r.customer_id=c.id and r.deleted_at is null
         where c.tenant_id=$1 and c.status='active' and c.deleted_at is null
           and r.layer in ('需唤醒','沉睡')
           and c.id = any($2::uuid[])`,
        [context.tenantId, customerIds],
      );
      for (const row of eligible.rows) {
        await client.query(
          `insert into customer_tags(id,tenant_id,customer_id,label,created_by,updated_by)
           values($1,$2,$3,$4,$5,$5)
           on conflict (tenant_id,customer_id,label)
           do update set deleted_at=null,updated_at=now(),updated_by=excluded.updated_by,version=customer_tags.version+1`,
          [randomUUID(), context.tenantId, row.id, label, context.userId],
        );
        applied += 1;
      }
      await this.record(client, context, 'customer.dormant_wake', context.tenantId, requestId, {
        requested: customerIds.length,
        applied,
        label,
      });
      await client.query(
        `insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by)
         values($1,$2,'customer.dormant_wake.v1','customer_rfm_tenant',$3,$4,$5,'page-m-003',$6,$6)`,
        [
          randomUUID(),
          context.tenantId,
          context.tenantId,
          { requested: customerIds.length, applied, label },
          uuid.test(requestId) ? requestId : randomUUID(),
          context.userId,
        ],
      );
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
    return { label, requested: customerIds.length, applied };
  }

  private async cohort(tenantId: string, months: number) {
    const result = await this.pool.query(
      `with bounds as (
         select date_trunc('month', now()) - make_interval(months => $2 - 1) as start_month
       ),
       cohort_customers as (
         select c.id as customer_id,
                date_trunc('month', c.created_at) as cohort_month
         from customers c, bounds b
         where c.tenant_id=$1 and c.status='active' and c.deleted_at is null
           and c.created_at >= b.start_month
       ),
       interactions as (
         select ft.customer_id, f.created_at as interacted_at
         from task_follow_ups f
         join tasks ft on ft.id=f.task_id
         where ft.tenant_id=$1 and f.deleted_at is null and ft.deleted_at is null
         union all
         select tp.customer_id, tp.occurred_at
         from employee_nurture_touchpoints tp
         where tp.tenant_id=$1 and tp.deleted_at is null
         union all
         select o.customer_id, o.occurred_at
         from customer_orders o
         where o.tenant_id=$1 and o.deleted_at is null
       )
       select
         to_char(cc.cohort_month, 'YYYY-MM') as cohort_month,
         count(distinct cc.customer_id)::int as enrolled,
         count(distinct case
           when i.interacted_at is not null
            and i.interacted_at < cc.cohort_month + interval '30 days'
           then cc.customer_id end)::int as active_within_30d,
         count(distinct case
           when i.interacted_at is not null
            and i.interacted_at < cc.cohort_month + interval '90 days'
           then cc.customer_id end)::int as active_within_90d,
         count(distinct case
           when r.layer in ('高价值-活跃','温和互动') then cc.customer_id end)::int as still_active
       from cohort_customers cc
       left join interactions i on i.customer_id=cc.customer_id
       left join customer_rfm_profiles r
         on r.tenant_id=$1 and r.customer_id=cc.customer_id and r.deleted_at is null
       group by cc.cohort_month
       order by cc.cohort_month asc`,
      [tenantId, months],
    );
    return result.rows.map((row) => {
      const enrolled = Number(row.enrolled) || 0;
      const active30 = Number(row.active_within_30d) || 0;
      const active90 = Number(row.active_within_90d) || 0;
      const stillActive = Number(row.still_active) || 0;
      return {
        cohortMonth: row.cohort_month as string,
        enrolled,
        activeWithin30d: active30,
        activeWithin90d: active90,
        stillActive,
        retained30Rate: enrolled ? Math.round((active30 / enrolled) * 1000) / 10 : 0,
        retained90Rate: enrolled ? Math.round((active90 / enrolled) * 1000) / 10 : 0,
      };
    });
  }

  private async repurchaseCycle(tenantId: string) {
    const result = await this.pool.query(
      `with events as (
         select ft.customer_id, f.created_at as occurred_at
         from task_follow_ups f
         join tasks ft on ft.id=f.task_id
         where ft.tenant_id=$1 and f.deleted_at is null and ft.deleted_at is null
         union all
         select tp.customer_id, tp.occurred_at
         from employee_nurture_touchpoints tp
         where tp.tenant_id=$1 and tp.deleted_at is null
         union all
         select o.customer_id, o.occurred_at
         from customer_orders o
         where o.tenant_id=$1 and o.deleted_at is null
       ),
       ordered as (
         select customer_id, occurred_at,
                lag(occurred_at) over (partition by customer_id order by occurred_at) as prev_at
         from events
       ),
       gaps as (
         select customer_id,
                extract(epoch from (occurred_at - prev_at))/86400.0 as gap_days
         from ordered
         where prev_at is not null and occurred_at > prev_at
       )
       select
         count(*)::int as gap_count,
         count(distinct customer_id)::int as sample_customers,
         coalesce(round(avg(gap_days)::numeric, 1), 0)::float8 as avg_days,
         coalesce(round((percentile_cont(0.5) within group (order by gap_days))::numeric, 1), 0)::float8 as median_days
       from gaps`,
      [tenantId],
    );
    const row = result.rows[0] ?? {};
    return {
      sampleCustomers: Number(row.sample_customers) || 0,
      gapCount: Number(row.gap_count) || 0,
      avgDays: Number(row.avg_days) || 0,
      medianDays: Number(row.median_days) || 0,
      unit: 'days_between_interactions',
      note: '复购周期按连续互动间隔（跟进/触点/订单痕迹）估算，非成交金额周期。',
    };
  }

  private async dormantQueue(tenantId: string) {
    const result = await this.pool.query(
      `select c.id, c.display_name, r.layer, r.recency_days, r.frequency_count, r.reach_count, r.computed_at,
              exists(
                select 1 from customer_tags t
                where t.tenant_id=c.tenant_id and t.customer_id=c.id
                  and t.label='沉睡唤醒' and t.deleted_at is null
              ) as wake_planned
       from customer_rfm_profiles r
       join customers c on c.id=r.customer_id and c.tenant_id=r.tenant_id
       where r.tenant_id=$1 and r.deleted_at is null and c.status='active' and c.deleted_at is null
         and r.layer in ('需唤醒','沉睡')
       order by case when r.layer='需唤醒' then 0 else 1 end,
                coalesce(r.recency_days, 9999) desc,
                c.display_name
       limit 100`,
      [tenantId],
    );
    return result.rows.map((row) => ({
      customerId: row.id as string,
      displayName: row.display_name as string,
      layer: row.layer as string,
      recencyDays: row.recency_days === null ? null : Number(row.recency_days),
      frequencyCount: Number(row.frequency_count) || 0,
      reachCount: Number(row.reach_count) || 0,
      computedAt: row.computed_at as string,
      wakePlanned: Boolean(row.wake_planned),
      deepLink: `/m/customers/${row.id}`,
    }));
  }

  private deriveLayer(recencyDays: number | null, frequencyCount: number | null): string {
    if (recencyDays === null || frequencyCount === null) return '沉睡';
    if (recencyDays <= 14 && frequencyCount >= 2) return '高价值-活跃';
    if (recencyDays <= 30 && frequencyCount >= 1) return '温和互动';
    if (recencyDays <= 60) return '需唤醒';
    return '沉睡';
  }

  private async record(
    client: Pool | PoolClient,
    context: OrganizationContext,
    action: string,
    resourceId: string,
    requestId: string,
    details: unknown,
  ) {
    await client.query(
      "insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,$4,'customer_rfm',$5,$6,'page-m-003',$7,$3,$3)",
      [
        randomUUID(),
        context.tenantId,
        context.userId,
        action,
        resourceId,
        uuid.test(requestId) ? requestId : randomUUID(),
        details,
      ],
    );
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
