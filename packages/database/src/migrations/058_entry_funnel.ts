import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;

/**
 * TOOL-PHASE-0 — 推广员工具：统一入口痕迹 L0+L1+L2 契约 + 全平台可见引流开关。
 *
 * - tenants.platform_visible_traffic : 开通后是否出现在全平台「附近」引流
 * - entry_funnel_events              : 观看/访问/跳转/停留/分享 + L1/L2 上下文
 *
 * 不存成交金额/支付结果（不碰钱、不碰销售）。
 */
export async function up(db: Kysely<Database>) {
  await db.schema
    .alterTable('tenants')
    .addColumn('platform_visible_traffic', 'boolean', (c) => c.notNull().defaultTo(false))
    .execute();

  await db.schema
    .createTable('entry_funnel_events')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.references('tenants.id'))
    .addColumn('actor_role', 'varchar(32)', (c) => c.notNull().defaultTo('anonymous'))
    .addColumn('event_code', 'varchar(48)', (c) => c.notNull())
    .addColumn('surface', 'varchar(48)', (c) => c.notNull())
    .addColumn('module_key', 'varchar(80)')
    .addColumn('target_platform', 'varchar(32)')
    .addColumn('target_url', 'varchar(2000)')
    .addColumn('target_tenant_id', 'uuid', (c) => c.references('tenants.id'))
    .addColumn('target_store_id', 'uuid', (c) => c.references('stores.id'))
    .addColumn('circle_id', 'uuid')
    .addColumn('source', 'varchar(160)')
    .addColumn('scene', 'varchar(160)')
    .addColumn('share_code', 'varchar(48)')
    .addColumn('session_id', 'varchar(64)')
    .addColumn('device', 'varchar(16)')
    .addColumn('geo_city', 'varchar(80)')
    .addColumn('geohash', 'varchar(16)')
    .addColumn('dwell_ms', 'integer')
    .addColumn('scroll_pct', 'integer')
    .addColumn('share_state', 'varchar(32)')
    .addColumn('payload', sql`jsonb`)
    .addColumn('occurred_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .execute();

  await db.schema
    .createIndex('entry_funnel_events_tenant_occurred_idx')
    .ifNotExists()
    .on('entry_funnel_events')
    .columns(['tenant_id', 'occurred_at'])
    .execute();
  await db.schema
    .createIndex('entry_funnel_events_code_occurred_idx')
    .ifNotExists()
    .on('entry_funnel_events')
    .columns(['event_code', 'occurred_at'])
    .execute();
  await db.schema
    .createIndex('entry_funnel_events_session_idx')
    .ifNotExists()
    .on('entry_funnel_events')
    .columns(['session_id', 'occurred_at'])
    .execute();
  await db.schema
    .createIndex('entry_funnel_events_target_store_idx')
    .ifNotExists()
    .on('entry_funnel_events')
    .columns(['target_store_id', 'occurred_at'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('entry_funnel_events').ifExists().execute();
  await db.schema.alterTable('tenants').dropColumn('platform_visible_traffic').execute();
}
