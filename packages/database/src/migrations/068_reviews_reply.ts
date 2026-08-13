import type { Kysely } from 'kysely';
import type { Database } from '../types.js';

/**
 * G1-W∞-114 — 评价待回复队列（MPC-05 / Phase2）。
 *
 * 诚实边界：回复仅是推广员工具登记在本地 `store_reviews` 档案上的回复痕迹，
 * **不接美团/抖音实时评价流、不代第三方回写、不含支付/成交金额、非本平台下单**。
 *
 * - `store_reviews` 新增回复痕迹字段 reply_text/replied_by/replied_at，
 *   供评价待回复队列（未回复 / 已回复）与回复工作流做单真源。
 */
export async function up(db: Kysely<Database>) {
  await db.schema.alterTable('store_reviews').addColumn('reply_text', 'varchar(1000)').execute();
  await db.schema.alterTable('store_reviews').addColumn('replied_by', 'uuid').execute();
  await db.schema.alterTable('store_reviews').addColumn('replied_at', 'timestamptz').execute();
  await db.schema
    .createIndex('store_reviews_reply_status_idx')
    .ifNotExists()
    .on('store_reviews')
    .columns(['tenant_id', 'replied_at', 'created_at'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropIndex('store_reviews_reply_status_idx').ifExists().execute();
  await db.schema.alterTable('store_reviews').dropColumn('replied_at').execute();
  await db.schema.alterTable('store_reviews').dropColumn('replied_by').execute();
  await db.schema.alterTable('store_reviews').dropColumn('reply_text').execute();
}
