import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;
const columns = (table: ReturnType<Kysely<Database>['schema']['createTable']>) =>
  table
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('active'))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1));

export async function up(db: Kysely<Database>) {
  await columns(
    db.schema
      .createTable('store_services')
      .ifNotExists()
      .addColumn('id', 'uuid', (c) => c.primaryKey())
      .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
      .addColumn('store_id', 'uuid', (c) => c.notNull().references('stores.id'))
      .addColumn('code', 'varchar(80)', (c) => c.notNull())
      .addColumn('name', 'varchar(160)', (c) => c.notNull())
      .addColumn('description', 'varchar(1000)')
      .addColumn('duration_minutes', 'integer')
      .addColumn('price_label', 'varchar(80)')
      .addColumn('rank', 'integer', (c) => c.notNull().defaultTo(0))
      .addUniqueConstraint('store_services_store_code_key', ['store_id', 'code']),
  ).execute();
  await columns(
    db.schema
      .createTable('store_benefits')
      .ifNotExists()
      .addColumn('id', 'uuid', (c) => c.primaryKey())
      .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
      .addColumn('store_id', 'uuid', (c) => c.notNull().references('stores.id'))
      .addColumn('title', 'varchar(160)', (c) => c.notNull())
      .addColumn('description', 'varchar(1000)')
      .addColumn('external_action_id', 'uuid', (c) => c.references('external_actions.id'))
      .addColumn('rank', 'integer', (c) => c.notNull().defaultTo(0)),
  ).execute();
  await columns(
    db.schema
      .createTable('store_content_items')
      .ifNotExists()
      .addColumn('id', 'uuid', (c) => c.primaryKey())
      .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
      .addColumn('store_id', 'uuid', (c) => c.notNull().references('stores.id'))
      .addColumn('content_type', 'varchar(48)', (c) => c.notNull().defaultTo('story'))
      .addColumn('title', 'varchar(160)', (c) => c.notNull())
      .addColumn('summary', 'varchar(1000)')
      .addColumn('rank', 'integer', (c) => c.notNull().defaultTo(0)),
  ).execute();
  await columns(
    db.schema
      .createTable('consumer_action_events')
      .ifNotExists()
      .addColumn('id', 'uuid', (c) => c.primaryKey())
      .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
      .addColumn('store_id', 'uuid', (c) => c.notNull().references('stores.id'))
      .addColumn('external_action_id', 'uuid', (c) => c.notNull().references('external_actions.id'))
      .addColumn('source', 'varchar(160)')
      .addColumn('idempotency_key', 'varchar(200)', (c) => c.notNull())
      .addUniqueConstraint('consumer_action_events_tenant_key_key', [
        'tenant_id',
        'idempotency_key',
      ]),
  ).execute();
  for (const table of ['store_services', 'store_benefits', 'store_content_items'] as const)
    await db.schema
      .createIndex(`${table}_tenant_store_rank_idx`)
      .ifNotExists()
      .on(table)
      .columns(['tenant_id', 'store_id', 'status', 'rank'])
      .execute();
  await db.schema
    .createIndex('consumer_action_events_tenant_store_idx')
    .ifNotExists()
    .on('consumer_action_events')
    .columns(['tenant_id', 'store_id', 'external_action_id'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  for (const table of [
    'consumer_action_events',
    'store_content_items',
    'store_benefits',
    'store_services',
  ] as const)
    await db.schema.dropTable(table).ifExists().execute();
}
