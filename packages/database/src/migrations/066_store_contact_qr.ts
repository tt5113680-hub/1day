import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;

/**
 * W∞-111 — 门店完整 CRUD + 三类触点二维码（MPC-02 / Phase2）。
 *
 * 诚实边界：二维码仅为「统一入口/门店/员工触点」的分流入口编码（可扫码归因到入口痕迹），
 * **不含收款、不含支付、不代第三方成交、不含成交金额**。扫码只进站/跳转，不建自营订单。
 *
 * - 该表是租户×门店范围的「商户码/门店码/员工码」触点注册表（contact_type 单一真源），
 *   contact_type ∈ merchant | store | employee，target_path 为可扫码的分流入口路径。
 */
export async function up(db: Kysely<Database>) {
  await db.schema
    .createTable('store_contact_qr_codes')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('store_id', 'uuid', (c) => c.notNull().references('stores.id'))
    .addColumn('merchant_id', 'uuid')
    .addColumn('contact_type', 'varchar(24)', (c) => c.notNull())
    .addColumn('group_by', 'varchar(48)', (c) => c.notNull())
    .addColumn('token', 'varchar(64)', (c) => c.notNull())
    .addColumn('label', 'varchar(120)', (c) => c.notNull())
    .addColumn('target_path', 'varchar(320)', (c) => c.notNull())
    .addColumn('scan_count', 'integer', (c) => c.notNull().defaultTo(0))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .addUniqueConstraint('store_contact_qr_codes_store_type_unique', ['tenant_id', 'store_id', 'contact_type'])
    .execute();
  await db.schema
    .createIndex('store_contact_qr_codes_tenant_type_idx')
    .ifNotExists()
    .on('store_contact_qr_codes')
    .columns(['tenant_id', 'contact_type'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('store_contact_qr_codes').ifExists().execute();
}
