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
      .createTable('discovery_channels')
      .ifNotExists()
      .addColumn('id', 'uuid', (c) => c.primaryKey())
      .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
      .addColumn('code', 'varchar(80)', (c) => c.notNull())
      .addColumn('name', 'varchar(160)', (c) => c.notNull())
      .addColumn('description', 'varchar(320)')
      .addColumn('rank', 'integer', (c) => c.notNull().defaultTo(0))
      .addUniqueConstraint('discovery_channels_tenant_code_key', ['tenant_id', 'code']),
  ).execute();
  await columns(
    db.schema
      .createTable('discovery_channel_merchants')
      .ifNotExists()
      .addColumn('id', 'uuid', (c) => c.primaryKey())
      .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
      .addColumn('channel_id', 'uuid', (c) => c.notNull().references('discovery_channels.id'))
      .addColumn('merchant_id', 'uuid', (c) => c.notNull().references('merchants.id'))
      .addColumn('rank', 'integer', (c) => c.notNull().defaultTo(0))
      .addUniqueConstraint('discovery_channel_merchant_key', ['channel_id', 'merchant_id']),
  ).execute();
  await columns(
    db.schema
      .createTable('business_circles')
      .ifNotExists()
      .addColumn('id', 'uuid', (c) => c.primaryKey())
      .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
      .addColumn('code', 'varchar(80)', (c) => c.notNull())
      .addColumn('name', 'varchar(160)', (c) => c.notNull())
      .addColumn('description', 'varchar(320)')
      .addColumn('rank', 'integer', (c) => c.notNull().defaultTo(0))
      .addUniqueConstraint('business_circles_tenant_code_key', ['tenant_id', 'code']),
  ).execute();
  await columns(
    db.schema
      .createTable('business_circle_merchants')
      .ifNotExists()
      .addColumn('id', 'uuid', (c) => c.primaryKey())
      .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
      .addColumn('business_circle_id', 'uuid', (c) => c.notNull().references('business_circles.id'))
      .addColumn('merchant_id', 'uuid', (c) => c.notNull().references('merchants.id'))
      .addColumn('rank', 'integer', (c) => c.notNull().defaultTo(0))
      .addUniqueConstraint('business_circle_merchant_key', ['business_circle_id', 'merchant_id']),
  ).execute();
  await columns(
    db.schema
      .createTable('merchant_locations')
      .ifNotExists()
      .addColumn('id', 'uuid', (c) => c.primaryKey())
      .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
      .addColumn('merchant_id', 'uuid', (c) => c.notNull().references('merchants.id'))
      .addColumn('latitude', sql`numeric(9,6)`, (c) => c.notNull())
      .addColumn('longitude', sql`numeric(9,6)`, (c) => c.notNull())
      .addColumn('address_label', 'varchar(320)')
      .addUniqueConstraint('merchant_locations_merchant_key', ['merchant_id']),
  ).execute();
  for (const [name, table, fields] of [
    ['discovery_channels_tenant_rank_idx', 'discovery_channels', ['tenant_id', 'status', 'rank']],
    ['business_circles_tenant_rank_idx', 'business_circles', ['tenant_id', 'status', 'rank']],
    [
      'merchant_locations_tenant_coordinates_idx',
      'merchant_locations',
      ['tenant_id', 'latitude', 'longitude'],
    ],
  ] as const)
    await db.schema
      .createIndex(name)
      .ifNotExists()
      .on(table)
      .columns([...fields])
      .execute();
}

export async function down(db: Kysely<Database>) {
  for (const table of [
    'merchant_locations',
    'business_circle_merchants',
    'business_circles',
    'discovery_channel_merchants',
    'discovery_channels',
  ] as const)
    await db.schema.dropTable(table).ifExists().execute();
}
