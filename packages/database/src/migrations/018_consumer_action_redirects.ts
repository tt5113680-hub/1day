import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;

export async function up(db: Kysely<Database>) {
  await db.schema
    .createTable('consumer_action_redirect_events')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('action_id', 'uuid', (c) => c.notNull().references('external_actions.id'))
    .addColumn('source', 'varchar(160)')
    .addColumn('return_to', 'varchar(2048)')
    .addColumn('idempotency_key', 'varchar(200)', (c) => c.notNull())
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .addUniqueConstraint('consumer_action_redirect_events_tenant_key_key', [
      'tenant_id',
      'idempotency_key',
    ])
    .execute();
  await db.schema
    .createIndex('consumer_action_redirect_events_tenant_action_idx')
    .ifNotExists()
    .on('consumer_action_redirect_events')
    .columns(['tenant_id', 'action_id'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('consumer_action_redirect_events').ifExists().execute();
}
