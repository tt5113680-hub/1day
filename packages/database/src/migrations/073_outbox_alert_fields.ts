import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;

/**
 * G1-W∞-120 — Outbox 死信一键重放 + 告警字段（Phase3 SaaS 最强，§6 W∞-SAAS-OUTBOX）。
 *
 * SaaS 最强目标：Outbox 死信不仅能逐条重放，还要能「一键重放全部」+ 可观测“告警字段”，
 * 让平台运维对 `needs_attention` 深度与凝固年龄可读、可按严重度处置、可证明重放被审计。
 *
 * `outbox_dlq_alerts` 是每次「事件进入 needs_attention 死信」的平台运维告警台账（观察层）：
 * 以 outbox_event_id 为主键线索，记录派生 alert_level（critical=已达最大重试 / warning=仍可重试）、
 * 凝固年龄 age_minutes、首次/最近观察时间、累积 alert_count、以及被重放清 理(replayed_at/replayed_by)。
 * 它只观察既有 outbox_events 真实状态，不改任何投递语义，也不替代 worker 投递。
 *
 * 诚实边界：Outbox 是平台/租户内的投递与同步队列；重放只恢复「本地投递状态」，
 * 不会调用美团/抖音等外部平台、不代表第三方成交、不含支付金额、非本平台下单、无 GMV。
 */
export async function up(db: Kysely<Database>) {
  await db.schema
    .createTable('outbox_dlq_alerts')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('outbox_event_id', 'uuid', (c) => c.notNull())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull())
    .addColumn('event_type', 'varchar(160)', (c) => c.notNull())
    .addColumn('aggregate_type', 'varchar(120)', (c) => c.notNull())
    .addColumn('attempts', 'integer', (c) => c.notNull().defaultTo(0))
    .addColumn('alert_level', 'varchar(16)', (c) => c.notNull())
    .addColumn('age_minutes', 'integer', (c) => c.notNull().defaultTo(0))
    .addColumn('alert_count', 'integer', (c) => c.notNull().defaultTo(1))
    .addColumn('first_seen_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('last_seen_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('status', 'varchar(16)', (c) => c.notNull().defaultTo('active'))
    .addColumn('replayed_at', 'timestamptz')
    .addColumn('replayed_by', 'uuid')
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .execute();
  await db.schema
    .createIndex('outbox_dlq_alerts_event_idx')
    .ifNotExists()
    .on('outbox_dlq_alerts')
    .column('outbox_event_id')
    .unique()
    .execute();
  await db.schema
    .createIndex('outbox_dlq_alerts_status_level_idx')
    .ifNotExists()
    .on('outbox_dlq_alerts')
    .columns(['status', 'alert_level'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropIndex('outbox_dlq_alerts_event_idx').ifExists().execute();
  await db.schema.dropIndex('outbox_dlq_alerts_status_level_idx').ifExists().execute();
  await db.schema.dropTable('outbox_dlq_alerts').ifExists().execute();
}
