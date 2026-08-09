import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;

export async function up(db: Kysely<Database>) {
  await db.schema
    .alterTable('tenants')
    .addColumn('auth_epoch', 'integer', (column) => column.notNull().defaultTo(0))
    .execute();

  await db.schema
    .createTable('sync_notifications')
    .ifNotExists()
    .addColumn('id', 'uuid', (column) => column.primaryKey())
    .addColumn('tenant_id', 'uuid', (column) => column.notNull().references('tenants.id'))
    .addColumn('store_id', 'uuid')
    .addColumn('topic', 'varchar(160)', (column) => column.notNull())
    .addColumn('event_type', 'varchar(160)', (column) => column.notNull())
    .addColumn('event_id', 'uuid', (column) => column.notNull())
    .addColumn('aggregate_type', 'varchar(120)', (column) => column.notNull())
    .addColumn('aggregate_id', 'uuid', (column) => column.notNull())
    .addColumn('aggregate_version', 'integer', (column) => column.notNull().defaultTo(1))
    .addColumn('correlation_id', 'uuid', (column) => column.notNull())
    .addColumn('occurred_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
    .execute();

  await db.schema
    .createIndex('sync_notifications_tenant_created_idx')
    .on('sync_notifications')
    .columns(['tenant_id', 'created_at'])
    .execute();

  await db.schema
    .createIndex('sync_notifications_event_topic_uidx')
    .unique()
    .on('sync_notifications')
    .columns(['event_id', 'topic'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('sync_notifications').ifExists().execute();
  await db.schema.alterTable('tenants').dropColumn('auth_epoch').execute();
}
