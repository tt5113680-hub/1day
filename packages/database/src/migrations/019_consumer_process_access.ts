import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;

export async function up(db: Kysely<Database>) {
  await db.schema
    .createTable('consumer_process_accesses')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('customer_id', 'uuid', (c) => c.notNull().references('customers.id'))
    .addColumn('order_id', 'uuid', (c) => c.notNull().references('customer_orders.id'))
    .addColumn('access_token_hash', 'varchar(128)', (c) => c.notNull())
    .addColumn('appointment_at', 'timestamptz')
    .addColumn('consultation_status', 'varchar(32)', (c) => c.notNull().defaultTo('pending'))
    .addColumn('exception_feedback', 'varchar(1000)')
    .addColumn('expires_at', 'timestamptz', (c) => c.notNull())
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('active'))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .addUniqueConstraint('consumer_process_accesses_tenant_order_key', ['tenant_id', 'order_id'])
    .execute();
  await db.schema
    .createIndex('consumer_process_accesses_tenant_lookup_idx')
    .ifNotExists()
    .on('consumer_process_accesses')
    .columns(['tenant_id', 'id', 'status'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('consumer_process_accesses').ifExists().execute();
}
