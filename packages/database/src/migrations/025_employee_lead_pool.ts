import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;

export async function up(db: Kysely<Database>) {
  await db.schema
    .createTable('employee_lead_pool_entries')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('customer_id', 'uuid', (c) => c.notNull().references('customers.id'))
    .addColumn('source_type', 'varchar(80)', (c) => c.notNull())
    .addColumn('priority', 'varchar(16)', (c) => c.notNull().defaultTo('normal'))
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('available'))
    .addColumn('assignee_employee_id', 'uuid', (c) => c.references('employees.id'))
    .addColumn('claimed_at', 'timestamptz')
    .addColumn('converted_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .addUniqueConstraint('employee_lead_pool_entries_customer_unique', ['tenant_id', 'customer_id'])
    .execute();
  await db.schema
    .createIndex('employee_lead_pool_entries_tenant_status_idx')
    .ifNotExists()
    .on('employee_lead_pool_entries')
    .columns(['tenant_id', 'status'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('employee_lead_pool_entries').ifExists().execute();
}
