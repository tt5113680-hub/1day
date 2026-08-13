import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;

/**
 * G1-W∞-117 — 管理通知中心闭环（MPC-13）+ 设置变更审计（MPC-12 / Phase2）。
 *
 * 诚实边界：通知状态（已读/忽略）与设置变更审计仅登记**推广员工具在租户内的待推进痕迹**，
 * **不含支付金额、销售成交或第三方订单履约状态、不接美团/抖音实时、非本平台下单**。
 *
 * `management_notifications` 把原先派生即弃的管理通知物化为持久档案行（与 `employee_notifications` 同构），
 * 使每条通知具备稳定 id / read_at / status(active|ignored) / version，可读、可忽略、可批量处置，
 * 形成 汇总→已读→忽略→批量 的管理通知闭环。`source_id` 保留派生源聚合 id 用于去重。
 */
export async function up(db: Kysely<Database>) {
  await db.schema
    .createTable('management_notifications')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('category', 'varchar(32)', (c) => c.notNull())
    .addColumn('source_type', 'varchar(64)', (c) => c.notNull())
    .addColumn('source_id', 'uuid', (c) => c.notNull())
    .addColumn('title', 'varchar(200)', (c) => c.notNull())
    .addColumn('body', 'varchar(1000)', (c) => c.notNull())
    .addColumn('deep_link', 'varchar(320)')
    .addColumn('sent_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('read_at', 'timestamptz')
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('active'))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .addUniqueConstraint('management_notifications_source_unique', [
      'tenant_id',
      'category',
      'source_type',
      'source_id',
    ])
    .execute();
  await db.schema
    .createIndex('management_notifications_inbox_idx')
    .ifNotExists()
    .on('management_notifications')
    .columns(['tenant_id', 'status', 'read_at', 'sent_at'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('management_notifications').ifExists().execute();
}
