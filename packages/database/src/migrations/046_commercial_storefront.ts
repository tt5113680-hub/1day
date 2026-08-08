import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;

export async function up(db: Kysely<Database>) {
  await db.schema
    .alterTable('stores')
    .addColumn('phone', 'varchar(48)')
    .addColumn('business_hours', 'varchar(240)')
    .addColumn('image_url', 'varchar(2000)')
    .addColumn('latitude', 'numeric')
    .addColumn('longitude', 'numeric')
    .execute();
  await db.schema
    .createTable('store_external_actions')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('store_id', 'uuid', (c) => c.notNull().references('stores.id'))
    .addColumn('external_action_id', 'uuid', (c) => c.notNull().references('external_actions.id'))
    .addColumn('description', 'varchar(1000)')
    .addColumn('sort_order', 'integer', (c) => c.notNull().defaultTo(0))
    .addColumn('enabled', 'boolean', (c) => c.notNull().defaultTo(true))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .addUniqueConstraint('store_external_actions_store_action_key', [
      'store_id',
      'external_action_id',
    ])
    .execute();
  await db.schema
    .createIndex('store_external_actions_tenant_store_idx')
    .ifNotExists()
    .on('store_external_actions')
    .columns(['tenant_id', 'store_id', 'enabled', 'sort_order'])
    .execute();
  await db.schema
    .alterTable('consumer_action_redirect_events')
    .addColumn('store_id', 'uuid')
    .addColumn('scene', 'varchar(160)')
    .addColumn('share_code', 'varchar(48)')
    .execute();
  await db.schema
    .createTable('consumer_store_outbound_events')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('store_id', 'uuid', (c) => c.notNull().references('stores.id'))
    .addColumn('outbound_type', 'varchar(32)', (c) => c.notNull())
    .addColumn('target_url', 'varchar(2000)', (c) => c.notNull())
    .addColumn('source', 'varchar(160)')
    .addColumn('scene', 'varchar(160)')
    .addColumn('share_code', 'varchar(48)')
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .execute();
  await db.schema
    .createIndex('consumer_store_outbound_events_tenant_store_idx')
    .ifNotExists()
    .on('consumer_store_outbound_events')
    .columns(['tenant_id', 'store_id', 'outbound_type'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('consumer_store_outbound_events').ifExists().execute();
  await db.schema
    .alterTable('consumer_action_redirect_events')
    .dropColumn('share_code')
    .dropColumn('scene')
    .dropColumn('store_id')
    .execute();
  await db.schema.dropTable('store_external_actions').ifExists().execute();
  await db.schema
    .alterTable('stores')
    .dropColumn('longitude')
    .dropColumn('latitude')
    .dropColumn('image_url')
    .dropColumn('business_hours')
    .dropColumn('phone')
    .execute();
}
