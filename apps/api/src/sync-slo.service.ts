import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';

/** 60 秒多端收敛 SLO（见 MULTI_TERMINAL_SYNC_SPEC.md §10 / §8 observability metrics）。 */
const SYNC_SLO_MAX_SECONDS = 60;

type SyncTopic =
  | 'operating'
  | 'storefront'
  | 'content'
  | 'membership'
  | 'lifecycle'
  | 'rbac'
  | 'channel'
  | 'circle';

const TOPIC_LABELS: Record<SyncTopic, string> = {
  operating: '跟进/任务作业',
  storefront: '入口页发布',
  content: '内容/投放',
  membership: '会员与权益',
  lifecycle: '租户生命周期',
  rbac: '权限/范围变更',
  channel: '渠道开通',
  circle: '商圈联盟',
};

const TOPIC_ALIASES: Record<string, SyncTopic> = {
  operating: 'operating',
  storefront: 'storefront',
  content: 'content',
  membership: 'membership',
  lifecycle: 'lifecycle',
  rbac: 'rbac',
  channel: 'channel',
  circle: 'circle',
};

/**
 * G1-W∞-124 — 多端 sync SLO 可测护栏（§6 W∞-SAAS-SYNC / §7 Phase3）。
 *
 * 全部由真实档案行现场推导（禁止假 BI）：
 *  - `topics[]`：每类同步主题的投影订阅滞后＝最新一条 sync_notifications 投影
 *    距 now 的秒数（spec §8「subscription lag / projection lag」）。每主题给
 *    `lagSeconds` 与 `withinSlo`（<=60s）；无任何投影的主题报 lagSeconds=null 且
 *    withinSlo=true（无数据不判定违约，诚实口径）。
 *  - `pendingOutbox`：租户内未投递（pending / needs_attention）的 outbox 条数与
 *    最旧一条的等待秒数（spec §8「outbox pending age」）。
 *  - `events24h`：近 24 小时已投影到 sync_notifications 的事件数（五端可观测 trace）。
 *  - `guardrail`：`{ maxSloSeconds: 60, within60s }`，当存在任何主题投影滞后或
 *    pending 等待或事件传播滞后超过 60s 时判定违约；无相关活跃事件且无 pending 时
 *    视为健康（诚实：没有事件就没有可测的传播滞后）。
 *
 * 只读、仅登记租户内同步状态；不碰钱/销售、不含支付、非本平台下单、不接美团/抖音实时。
 */
@Injectable()
export class SyncSloService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  async report(context: OrganizationContext) {
    const tenantId = context.tenantId;

    const topicRows = (
      await this.pool.query(
        `with last as (
           select topic, max(occurred_at) projected_at
           from sync_notifications
           where tenant_id=$1
           group by topic
         )
         select t.topic, t.projected_at, extract(epoch from (now() - t.projected_at))::float8 lag_seconds,
                (select count(*)::int from sync_notifications n where n.tenant_id=$1) events
         from last t order by t.topic asc`,
        [tenantId],
      )
    ).rows;

    const pending = (
      await this.pool.query(
        `select
            (select count(*)::int from outbox_events
              where tenant_id=$1 and deleted_at is null and status in ('pending','needs_attention')) pending_count,
            (select extract(epoch from (now() - min(created_at)))::float8 from outbox_events
              where tenant_id=$1 and deleted_at is null and status in ('pending','needs_attention')) oldest_age_seconds,
            (select count(*)::int from sync_notifications
              where tenant_id=$1 and occurred_at > now()-interval '24 hours') events24h`,
        [tenantId],
      )
    ).rows[0];

    const topics = topicRows.map((row) => {
      const topicKey = String(row.topic).split(':').at(-1) as SyncTopic;
      const lag = Number(row.lag_seconds);
      const lagSeconds = Number.isFinite(lag) ? Math.round(lag * 100) / 100 : null;
      const withinSlo = lagSeconds === null || lagSeconds <= SYNC_SLO_MAX_SECONDS;
      return {
        topic: TOPIC_ALIASES[topicKey] ?? topicKey,
        label: TOPIC_LABELS[topicKey],
        eventType: null as string | null,
        aggregateType: null as string | null,
        aggregateId: null as string | null,
        projectedAt: (row.projected_at as string | null) ?? null,
        lagSeconds,
        withinSlo,
      };
    });

    const sources = (
      await this.pool.query(
        `select n.topic, n.event_type, n.aggregate_type, n.aggregate_id, n.occurred_at
         from sync_notifications n
         where n.tenant_id=$1
         order by n.occurred_at desc, n.id asc
         limit 5`,
        [tenantId],
      )
    ).rows.map((row) => ({
      topic: String(row.topic).split(':').at(-1),
      eventType: row.event_type as string,
      aggregateType: row.aggregate_type as string,
      aggregateId: row.aggregate_id as string,
      projectedAt: row.occurred_at as string,
    }));

    const topicsWithSource = topics.map((topic) => {
      const match = sources.find((source) => source.topic === topic.topic);
      return match
        ? {
            ...topic,
            eventType: match.eventType,
            aggregateType: match.aggregateType,
            aggregateId: match.aggregateId,
          }
        : topic;
    });

    const pendingCount = Number(pending.pending_count);
    const oldestAgeSeconds =
      pending.oldest_age_seconds !== null && Number.isFinite(Number(pending.oldest_age_seconds))
        ? Math.round(Number(pending.oldest_age_seconds) * 100) / 100
        : null;
    const events24h = Number(pending.events24h);

    const hasMeasurableLag = topics.some((t) => t.lagSeconds !== null);
    const topicWithinSlo = topics.every((t) => t.withinSlo);
    const pendingWithinSlo = pendingCount === 0 || (oldestAgeSeconds ?? 0) <= SYNC_SLO_MAX_SECONDS;
    const within60s =
      (!hasMeasurableLag && pendingCount === 0) || (topicWithinSlo && pendingWithinSlo);

    return {
      topics: topicsWithSource,
      pendingOutbox: {
        count: pendingCount,
        oldestAgeSeconds,
        withinSlo: pendingWithinSlo,
      },
      events24h,
      guardrail: {
        maxSloSeconds: SYNC_SLO_MAX_SECONDS,
        within60s,
      },
      measuredTopics: topics.filter((t) => t.lagSeconds !== null).length,
    };
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
