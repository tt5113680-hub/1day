import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;

export async function up(db: Kysely<Database>) {
  await db.schema
    .createTable('store_managers')
    .ifNotExists()
    .addColumn('id', 'uuid', (column) => column.primaryKey())
    .addColumn('tenant_id', 'uuid', (column) => column.notNull().references('tenants.id'))
    .addColumn('store_id', 'uuid', (column) => column.notNull().references('stores.id'))
    .addColumn('employee_id', 'uuid', (column) => column.notNull().references('employees.id'))
    .addColumn('status', 'varchar(32)', (column) => column.notNull().defaultTo('active'))
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (column) => column.notNull().defaultTo(1))
    .addUniqueConstraint('store_managers_store_employee_key', ['store_id', 'employee_id'])
    .execute();
  await db.schema
    .createIndex('store_managers_tenant_store_idx')
    .ifNotExists()
    .on('store_managers')
    .columns(['tenant_id', 'store_id', 'status'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('store_managers').ifExists().execute();
}
