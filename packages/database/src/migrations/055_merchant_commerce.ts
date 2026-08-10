import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;

/**
 * G1-W5: Management PC 订单·评价·营销骨架 (MPC-04/05/07, 本地数据).
 *
 * - Extend `customer_orders` with merchant-facing store linkage and fulfilment
 *   fields so the Order Center can render real, tenant-scoped rows (order data
 *   already exists for the commercial/recovery loops; these are additive optional
 *   columns and do not break existing inserts that omit them).
 * - `store_reviews` — Meituan merchant review management surface (rating/text/etc).
 * - `marketing_campaigns` — Meituan marketing center (券/活动) skeleton with honest
 *   local `source`, `status` window and delivery note. No fake third-party sync.
 */
export async function up(db: Kysely<Database>) {
  await db.schema
    .alterTable('customer_orders')
    .addColumn('store_id', 'uuid', (c) => c.references('stores.id'))
    .addColumn('source', 'varchar(32)', (c) => c.notNull().defaultTo('local'))
    .addColumn('amount_cents', 'bigint', (c) => c.notNull().defaultTo(0))
    .addColumn('currency', 'varchar(3)', (c) => c.notNull().defaultTo('CNY'))
    .addColumn('fulfillment_status', 'varchar(32)', (c) => c.notNull().defaultTo('paid'))
    .addColumn('items', 'jsonb', (c) => c.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn('merchant_note', 'varchar(500)')
    .execute();

  await db.schema
    .createTable('store_reviews')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('store_id', 'uuid', (c) => c.notNull().references('stores.id'))
    .addColumn('customer_id', 'uuid', (c) => c.references('customers.id'))
    .addColumn('rating', 'integer', (c) => c.notNull())
    .addColumn('content', 'varchar(1000)', (c) => c.notNull())
    .addColumn('reviewer_label', 'varchar(80)', (c) => c.notNull())
    .addColumn('source', 'varchar(32)', (c) => c.notNull().defaultTo('local'))
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('active'))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .execute();

  await db.schema
    .createTable('marketing_campaigns')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('store_id', 'uuid', (c) => c.notNull().references('stores.id'))
    .addColumn('offer_id', 'uuid', (c) => c.references('store_service_platform_offers.id'))
    .addColumn('campaign_type', 'varchar(32)', (c) => c.notNull())
    .addColumn('title', 'varchar(160)', (c) => c.notNull())
    .addColumn('description', 'varchar(500)')
    .addColumn('delivery_channel', 'varchar(64)', (c) => c.notNull().defaultTo('local'))
    .addColumn('starts_at', 'timestamptz', (c) => c.notNull())
    .addColumn('ends_at', 'timestamptz', (c) => c.notNull())
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('draft'))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .execute();

  await db.schema.createIndex('store_reviews_tenant_lookup_idx').on('store_reviews').columns([
    'tenant_id',
    'store_id',
    'created_at',
  ]).execute();
  await db.schema.createIndex('marketing_campaigns_tenant_lookup_idx').on('marketing_campaigns').columns([
    'tenant_id',
    'store_id',
    'starts_at',
  ]).execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropIndex('marketing_campaigns_tenant_lookup_idx').ifExists().execute();
  await db.schema.dropIndex('store_reviews_tenant_lookup_idx').ifExists().execute();
  await db.schema.dropTable('marketing_campaigns').ifExists().execute();
  await db.schema.dropTable('store_reviews').ifExists().execute();
  await db.schema
    .alterTable('customer_orders')
    .dropColumn('merchant_note')
    .dropColumn('items')
    .dropColumn('fulfillment_status')
    .dropColumn('currency')
    .dropColumn('amount_cents')
    .dropColumn('source')
    .dropColumn('store_id')
    .execute();
}
