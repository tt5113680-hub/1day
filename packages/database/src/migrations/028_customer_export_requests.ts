import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;

export async function up(db: Kysely<Database>) {
  await db.schema
    .createTable('customer_export_requests')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('filters', 'jsonb', (c) => c.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn('requested_by', 'uuid', (c) => c.notNull().references('users.id'))
    .addColumn('approved_by', 'uuid')
    .addColumn('approved_at', 'timestamptz')
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('pending'))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .execute();
  await db.schema
    .createIndex('customer_export_requests_tenant_status_idx')
    .ifNotExists()
    .on('customer_export_requests')
    .columns(['tenant_id', 'status', 'created_at'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('customer_export_requests').ifExists().execute();
}
