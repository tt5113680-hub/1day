import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;

/**
 * G1-W∞-118 — 套餐配额触顶硬拦截（Phase3 SaaS 最强，§6 W∞-SAAS-QUOTA）。
 *
 * 诚实边界：配额仅登记「推广员工具在租户内可承载的入口/客户/开放账号」规模上限，
 * 拦截只拒绝**超额的新建写**，不改数据、不碰钱/销售/管店数据、无 GMV、
 * 不含支付金额、非本平台下单、不接美团/抖音实时。
 *
 * `tenant_quota_rejections` 是每次「配额触顶、写被硬拒」的持久台账：
 * 记录被拒维度(dimension=users|customers|stores)、尝试的动作(source_resource)、
 * 当时的已用量/上限、操作者，供租户侧核查「为什么这一笔被拒」并可观测升级引导。
 * 与 `platform_tenant_settings.quotas`（{users,customers,stores}）构成配额闭环。
 */
export async function up(db: Kysely<Database>) {
  await db.schema
    .createTable('tenant_quota_rejections')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('dimension', 'varchar(32)', (c) => c.notNull())
    .addColumn('source_resource', 'varchar(64)', (c) => c.notNull())
    .addColumn('source_id', 'uuid')
    .addColumn('current_usage', 'integer', (c) => c.notNull())
    .addColumn('current_limit', 'integer', (c) => c.notNull())
    .addColumn('actor_id', 'uuid')
    .addColumn('rejected_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .execute();
  await db.schema
    .createIndex('tenant_quota_rejections_tenant_dimension_idx')
    .ifNotExists()
    .on('tenant_quota_rejections')
    .columns(['tenant_id', 'dimension', 'rejected_at'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('tenant_quota_rejections').ifExists().execute();
}
