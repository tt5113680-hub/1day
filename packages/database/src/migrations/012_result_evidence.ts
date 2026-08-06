import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;

export async function up(db: Kysely<Database>) {
  await db.schema
    .createTable('customer_orders')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('customer_id', 'uuid', (c) => c.notNull().references('customers.id'))
    .addColumn('order_number', 'varchar(120)', (c) => c.notNull())
    .addColumn('occurred_at', 'timestamptz', (c) => c.notNull())
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('active'))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .addUniqueConstraint('customer_orders_tenant_order_number_key', ['tenant_id', 'order_number'])
    .execute();
  await db.schema
    .createTable('evidence_files')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('order_id', 'uuid', (c) => c.notNull().references('customer_orders.id'))
    .addColumn('evidence_type', 'varchar(32)', (c) => c.notNull())
    .addColumn('original_filename', 'varchar(180)', (c) => c.notNull())
    .addColumn('media_type', 'varchar(100)', (c) => c.notNull())
    .addColumn('byte_size', 'integer', (c) => c.notNull())
    .addColumn('content_sha256', 'char(64)', (c) => c.notNull())
    .addColumn('content', 'bytea', (c) => c.notNull())
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('active'))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .execute();
  await db.schema
    .createTable('verification_codes')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('order_id', 'uuid', (c) => c.notNull().references('customer_orders.id'))
    .addColumn('code_hash', 'char(64)', (c) => c.notNull())
    .addColumn('expires_at', 'timestamptz', (c) => c.notNull())
    .addColumn('redeemed_at', 'timestamptz')
    .addColumn('redeemed_by', 'uuid')
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('issued'))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .addUniqueConstraint('verification_codes_tenant_code_hash_key', ['tenant_id', 'code_hash'])
    .execute();
  await db.schema
    .createTable('connector_results')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('order_id', 'uuid', (c) => c.notNull().references('customer_orders.id'))
    .addColumn('connector_code', 'varchar(64)', (c) => c.notNull())
    .addColumn('external_reference', 'varchar(160)', (c) => c.notNull())
    .addColumn('result_status', 'varchar(32)', (c) => c.notNull())
    .addColumn('payload', 'jsonb', (c) => c.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn('received_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('received'))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .addUniqueConstraint('connector_results_tenant_connector_reference_key', [
      'tenant_id',
      'connector_code',
      'external_reference',
    ])
    .execute();
  for (const [table, columns] of [
    ['customer_orders', ['tenant_id', 'customer_id', 'occurred_at']],
    ['evidence_files', ['tenant_id', 'order_id']],
    ['verification_codes', ['tenant_id', 'order_id', 'status']],
    ['connector_results', ['tenant_id', 'order_id', 'received_at']],
  ] as const)
    await db.schema
      .createIndex(`${table}_tenant_lookup_idx`)
      .ifNotExists()
      .on(table)
      .columns([...columns])
      .execute();
}

export async function down(db: Kysely<Database>) {
  for (const table of [
    'connector_results',
    'verification_codes',
    'evidence_files',
    'customer_orders',
  ] as const)
    await db.schema.dropTable(table).ifExists().execute();
}
