import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

export async function up(db: Kysely<Database>) {
  await db.schema
    .createTable('channel_merchant_onboardings')
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('channel_id', 'uuid', (c) => c.notNull().references('platform_channels.id'))
    .addColumn('merchant_tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('invitation_email', 'varchar(320)', (c) => c.notNull())
    .addColumn('invitation_status', 'varchar(32)', (c) => c.notNull().defaultTo('prepared'))
    .addColumn('template_code', 'varchar(32)', (c) => c.notNull())
    .addColumn('plan', 'varchar(32)', (c) => c.notNull())
    .addColumn('delivery_status', 'varchar(32)', (c) => c.notNull().defaultTo('pending'))
    .addColumn('delivery_note', 'varchar(500)')
    .addColumn('delivered_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .addUniqueConstraint('channel_merchant_onboardings_channel_merchant_key', [
      'channel_id',
      'merchant_tenant_id',
    ])
    .execute();
  await db.schema
    .createIndex('channel_merchant_onboardings_lookup_idx')
    .on('channel_merchant_onboardings')
    .columns(['tenant_id', 'channel_id', 'delivery_status'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('channel_merchant_onboardings').execute();
}
