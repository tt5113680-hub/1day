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
      .createTable('platform_channels')
      .ifNotExists()
      .addColumn('id', 'uuid', (c) => c.primaryKey())
      .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
      .addColumn('code', 'varchar(80)', (c) => c.notNull())
      .addColumn('name', 'varchar(160)', (c) => c.notNull())
      .addColumn('onboarding_status', 'varchar(32)', (c) => c.notNull().defaultTo('open'))
      .addColumn('service_status', 'varchar(32)', (c) => c.notNull().defaultTo('ready'))
      .addUniqueConstraint('platform_channels_tenant_code_key', ['tenant_id', 'code']),
  ).execute();
  await columns(
    db.schema
      .createTable('platform_channel_merchants')
      .ifNotExists()
      .addColumn('id', 'uuid', (c) => c.primaryKey())
      .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
      .addColumn('channel_id', 'uuid', (c) => c.notNull().references('platform_channels.id'))
      .addColumn('merchant_tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
      .addColumn('onboarding_status', 'varchar(32)', (c) => c.notNull().defaultTo('invited'))
      .addColumn('service_status', 'varchar(32)', (c) => c.notNull().defaultTo('pending'))
      .addUniqueConstraint('platform_channel_merchants_channel_tenant_key', [
        'channel_id',
        'merchant_tenant_id',
      ]),
  ).execute();
  await db.schema
    .createIndex('platform_channel_merchants_pool_idx')
    .ifNotExists()
    .on('platform_channel_merchants')
    .columns(['tenant_id', 'channel_id', 'onboarding_status'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('platform_channel_merchants').ifExists().execute();
  await db.schema.dropTable('platform_channels').ifExists().execute();
}
