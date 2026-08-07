import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';
const now = sql`now()`;
export async function up(db: Kysely<Database>) {
  await db.schema
    .createTable('connector_configs')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('code', 'varchar(64)', (c) => c.notNull())
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('pending_authorization'))
    .addColumn('secret_fingerprint', 'varchar(128)')
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .addUniqueConstraint('connector_configs_tenant_code', ['tenant_id', 'code'])
    .execute();
  await db.schema
    .createTable('connector_logs')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('connector_id', 'uuid', (c) => c.notNull().references('connector_configs.id'))
    .addColumn('status', 'varchar(32)', (c) => c.notNull())
    .addColumn('message', 'varchar(500)', (c) => c.notNull())
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .execute();
}
export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('connector_logs').ifExists().execute();
  await db.schema.dropTable('connector_configs').ifExists().execute();
}
