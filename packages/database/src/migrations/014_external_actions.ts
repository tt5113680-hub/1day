import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';
const now = sql`now()`;
export async function up(db: Kysely<Database>) {
  await db.schema
    .createTable('external_actions')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('code', 'varchar(80)', (c) => c.notNull())
    .addColumn('name', 'varchar(120)', (c) => c.notNull())
    .addColumn('action_type', 'varchar(32)', (c) => c.notNull())
    .addColumn('target_url', 'varchar(2000)')
    .addColumn('mini_program_app_id', 'varchar(128)')
    .addColumn('mini_program_path', 'varchar(1024)')
    .addColumn('platform', 'varchar(64)')
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('active'))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .addUniqueConstraint('external_actions_tenant_code_key', ['tenant_id', 'code'])
    .execute();
  await db.schema
    .createTable('external_action_events')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('action_id', 'uuid', (c) => c.notNull().references('external_actions.id'))
    .addColumn('event_type', 'varchar(32)', (c) => c.notNull())
    .addColumn('actor_id', 'uuid')
    .addColumn('context', 'jsonb', (c) => c.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .execute();
  await db.schema
    .createIndex('external_actions_tenant_lookup_idx')
    .ifNotExists()
    .on('external_actions')
    .columns(['tenant_id', 'status'])
    .execute();
  await db.schema
    .createIndex('external_action_events_tenant_action_idx')
    .ifNotExists()
    .on('external_action_events')
    .columns(['tenant_id', 'action_id'])
    .execute();
}
export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('external_action_events').ifExists().execute();
  await db.schema.dropTable('external_actions').ifExists().execute();
}
