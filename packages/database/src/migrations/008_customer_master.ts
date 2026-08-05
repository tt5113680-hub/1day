import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';
const now = sql`now()`;
export async function up(db: Kysely<Database>) {
  await db.schema
    .createTable('customers')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('display_name', 'varchar(160)', (c) => c.notNull())
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('active'))
    .addColumn('merged_into_id', 'uuid')
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .execute();
  await db.schema
    .createTable('customer_identities')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('customer_id', 'uuid', (c) => c.notNull().references('customers.id'))
    .addColumn('identity_type', 'varchar(40)', (c) => c.notNull())
    .addColumn('identity_value_hash', 'varchar(128)', (c) => c.notNull())
    .addColumn('masked_value', 'varchar(160)', (c) => c.notNull())
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('active'))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .addUniqueConstraint('customer_identity_tenant_type_hash_unique', [
      'tenant_id',
      'identity_type',
      'identity_value_hash',
    ])
    .execute();
  await db.schema
    .createTable('customer_merges')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('source_customer_id', 'uuid', (c) => c.notNull().references('customers.id'))
    .addColumn('target_customer_id', 'uuid', (c) => c.notNull().references('customers.id'))
    .addColumn('reason', 'varchar(320)', (c) => c.notNull())
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('merged'))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .execute();
  for (const [table, column] of [
    ['customers', 'tenant_id'],
    ['customer_identities', 'tenant_id'],
    ['customer_identities', 'customer_id'],
    ['customer_merges', 'tenant_id'],
  ] as const)
    await db.schema
      .createIndex(`${table}_${column}_idx`)
      .ifNotExists()
      .on(table)
      .column(column)
      .execute();
}
export async function down(db: Kysely<Database>) {
  for (const t of ['customer_merges', 'customer_identities', 'customers'] as const)
    await db.schema.dropTable(t).ifExists().execute();
}
