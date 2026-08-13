import type { Kysely } from 'kysely';
import type { Database } from '../types.js';

/**
 * G1-W∞-112 — 商品分类树 + 批量上下架 + 跳转排行（MPC-03 / Phase2）。
 *
 * 诚实边界：分类仅是商品/套餐入口的组织维度；批量上下架只登记套餐可见状态；
 * **跳转排行仅为入口痕迹（entry_funnel_events 中 jump/jump_confirm）的聚合，不含支付、不含成交、不代第三方成交**。
 *
 * - store_services 新增 category 分类维度（可为空 = 未分类），配合批量状态与跳转排行使用。
 */
export async function up(db: Kysely<Database>) {
  await db.schema.alterTable('store_services').addColumn('category', 'varchar(80)').execute();
  await db.schema
    .createIndex('store_services_tenant_category_idx')
    .ifNotExists()
    .on('store_services')
    .columns(['tenant_id', 'category'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.alterTable('store_services').dropColumn('category').execute();
  await db.schema.dropIndex('store_services_tenant_category_idx').ifExists().execute();
}
