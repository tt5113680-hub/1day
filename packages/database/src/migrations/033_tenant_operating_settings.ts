import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;

export async function up(db: Kysely<Database>) {
  await db.schema
    .createTable('tenant_operating_settings')
    .ifNotExists()
    .addColumn('id', 'uuid', (column) => column.primaryKey())
    .addColumn('tenant_id', 'uuid', (column) => column.notNull().references('tenants.id').unique())
    .addColumn('reminder_policy', 'jsonb', (column) => column.notNull())
    .addColumn('approval_policy', 'jsonb', (column) => column.notNull())
    .addColumn('do_not_disturb_policy', 'jsonb', (column) => column.notNull())
    .addColumn('tag_policy', 'jsonb', (column) => column.notNull())
    .addColumn('ownership_policy', 'jsonb', (column) => column.notNull())
    .addColumn('brand_policy', 'jsonb', (column) => column.notNull())
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (column) => column.notNull().defaultTo(1))
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('tenant_operating_settings').ifExists().execute();
}
