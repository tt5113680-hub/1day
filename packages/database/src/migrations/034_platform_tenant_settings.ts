import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';
const now = sql`now()`;
export async function up(db: Kysely<Database>) {
  await db.schema
    .createTable('platform_tenant_settings')
    .ifNotExists()
    .addColumn('id', 'uuid', (column) => column.primaryKey())
    .addColumn('tenant_id', 'uuid', (column) => column.notNull().references('tenants.id').unique())
    .addColumn('plan', 'varchar(32)', (column) => column.notNull().defaultTo('starter'))
    .addColumn('quotas', 'jsonb', (column) => column.notNull())
    .addColumn('risk_level', 'varchar(16)', (column) => column.notNull().defaultTo('low'))
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (column) => column.notNull().defaultTo(1))
    .execute();
}
export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('platform_tenant_settings').ifExists().execute();
}
