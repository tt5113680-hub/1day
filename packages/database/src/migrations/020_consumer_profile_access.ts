import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;

export async function up(db: Kysely<Database>) {
  await db.schema
    .createTable('consumer_profile_accesses')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('customer_id', 'uuid', (c) => c.notNull().references('customers.id'))
    .addColumn('access_token_hash', 'varchar(128)', (c) => c.notNull())
    .addColumn('consent_status', 'varchar(32)', (c) => c.notNull().defaultTo('granted'))
    .addColumn('consent_version', 'varchar(64)', (c) => c.notNull().defaultTo('v1'))
    .addColumn('consented_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('revoked_at', 'timestamptz')
    .addColumn('expires_at', 'timestamptz', (c) => c.notNull())
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('active'))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .execute();
  await db.schema
    .createIndex('consumer_profile_accesses_tenant_lookup_idx')
    .ifNotExists()
    .on('consumer_profile_accesses')
    .columns(['tenant_id', 'id', 'status'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('consumer_profile_accesses').ifExists().execute();
}
