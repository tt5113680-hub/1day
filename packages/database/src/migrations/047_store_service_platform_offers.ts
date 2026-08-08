import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;

export async function up(db: Kysely<Database>) {
  await db.schema
    .createTable('store_service_platform_offers')
    .addColumn('id', 'uuid', (column) => column.primaryKey())
    .addColumn('tenant_id', 'uuid', (column) => column.notNull().references('tenants.id'))
    .addColumn('store_id', 'uuid', (column) => column.notNull().references('stores.id'))
    .addColumn('service_id', 'uuid', (column) => column.notNull().references('store_services.id'))
    .addColumn('external_action_id', 'uuid', (column) =>
      column.notNull().references('external_actions.id'),
    )
    .addColumn('offer_price', 'numeric', (column) => column.notNull())
    .addColumn('market_price', 'numeric')
    .addColumn('sort_order', 'integer', (column) => column.notNull().defaultTo(0))
    .addColumn('status', 'varchar(32)', (column) => column.notNull().defaultTo('active'))
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (column) => column.notNull().defaultTo(1))
    .addUniqueConstraint('store_service_platform_offers_service_action_key', [
      'service_id',
      'external_action_id',
    ])
    .execute();
  await db.schema
    .createIndex('store_service_platform_offers_tenant_store_idx')
    .on('store_service_platform_offers')
    .columns(['tenant_id', 'store_id', 'service_id', 'status', 'sort_order'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('store_service_platform_offers').execute();
}
