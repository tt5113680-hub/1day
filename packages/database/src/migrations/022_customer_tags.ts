import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;

export async function up(db: Kysely<Database>) {
  await db.schema
    .createTable('customer_tags')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('customer_id', 'uuid', (c) => c.notNull().references('customers.id'))
    .addColumn('label', 'varchar(80)', (c) => c.notNull())
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .addUniqueConstraint('customer_tags_unique', ['tenant_id', 'customer_id', 'label'])
    .execute();
  await db.schema
    .createIndex('customer_tags_tenant_customer_idx')
    .ifNotExists()
    .on('customer_tags')
    .columns(['tenant_id', 'customer_id'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('customer_tags').ifExists().execute();
}
