import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;

/**
 * W∞-109 — CRM 深操作：RFM 自动分层（MPC-06 / Phase1 1.4）。
 *
 * 每个客户的「互动 RFM」画像，由真实客户关联数据（跟进、触点、订单痕迹、来源）
 * 现场计算，不打假假分层。诚实边界：R/F/M 均为互动口径，**不含资金成交**。
 *  - R = 最近互动（距最近一次跟进/触点/订单痕迹的天数）
 *  - F = 互动频次（回看窗口内跟进/触点/订单痕迹/来源数）
 *  - M = 触达覆盖（来源/贡献/证据等去重触达通道数，非金额）
 *
 * `layer` 由后端按 R/F/M 阈值推导并落库，作为列表筛选/分布/详情的单一真源。
 */
export async function up(db: Kysely<Database>) {
  await db.schema
    .createTable('customer_rfm_profiles')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('customer_id', 'uuid', (c) => c.notNull().references('customers.id'))
    .addColumn('recency_days', 'integer')
    .addColumn('frequency_count', 'integer')
    .addColumn('reach_count', 'integer')
    .addColumn('layer', 'varchar(40)')
    .addColumn('window_days', 'integer')
    .addColumn('computed_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .addUniqueConstraint('customer_rfm_profiles_customer_unique', ['tenant_id', 'customer_id'])
    .execute();
  await db.schema
    .createIndex('customer_rfm_profiles_tenant_layer_idx')
    .ifNotExists()
    .on('customer_rfm_profiles')
    .columns(['tenant_id', 'layer'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('customer_rfm_profiles').ifExists().execute();
}
