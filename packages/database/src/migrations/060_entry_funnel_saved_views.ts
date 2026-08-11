import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

/**
 * TOOL-PHASE-5 — 自助分析保存视图（只存 L0–L2 查询配置，无成交字段）。
 */
export async function up(db: Kysely<Database>) {
  await db.schema
    .createTable('entry_funnel_saved_views')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('name', 'varchar(120)', (c) => c.notNull())
    .addColumn('days', 'integer', (c) => c.notNull().defaultTo(7))
    .addColumn('group_by', 'varchar(32)', (c) => c.notNull().defaultTo('module_key'))
    .addColumn('surface', 'varchar(48)')
    .addColumn('module_key', 'varchar(80)')
    .addColumn('target_platform', 'varchar(32)')
    .addColumn('event_code', 'varchar(48)')
    .addColumn('industry_template', 'varchar(32)')
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('active'))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .execute();

  await db.schema
    .createIndex('entry_funnel_saved_views_tenant_name_idx')
    .ifNotExists()
    .on('entry_funnel_saved_views')
    .columns(['tenant_id', 'name'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('entry_funnel_saved_views').ifExists().execute();
}
