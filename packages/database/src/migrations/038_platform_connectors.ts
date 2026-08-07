import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;

export async function up(db: Kysely<Database>) {
  await db.schema
    .createTable('platform_connector_definitions')
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('code', 'varchar(64)', (c) => c.notNull())
    .addColumn('name', 'varchar(120)', (c) => c.notNull())
    .addColumn('auth_mode', 'varchar(32)', (c) => c.notNull())
    .addColumn('rate_limit_per_minute', 'integer', (c) => c.notNull())
    .addColumn('health_status', 'varchar(32)', (c) => c.notNull().defaultTo('unknown'))
    .addColumn('health_checked_at', 'timestamptz')
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('active'))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .addUniqueConstraint('platform_connector_definitions_tenant_code_key', ['tenant_id', 'code'])
    .execute();
  await db.schema
    .createTable('platform_connector_logs')
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('connector_id', 'uuid', (c) =>
      c.notNull().references('platform_connector_definitions.id'),
    )
    .addColumn('status', 'varchar(32)', (c) => c.notNull())
    .addColumn('message', 'varchar(500)', (c) => c.notNull())
    .addColumn('observed_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .execute();
  await db.schema
    .createIndex('platform_connector_definitions_lookup_idx')
    .on('platform_connector_definitions')
    .columns(['tenant_id', 'status'])
    .execute();
  await db.schema
    .createIndex('platform_connector_logs_lookup_idx')
    .on('platform_connector_logs')
    .columns(['tenant_id', 'connector_id', 'observed_at'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('platform_connector_logs').execute();
  await db.schema.dropTable('platform_connector_definitions').execute();
}
