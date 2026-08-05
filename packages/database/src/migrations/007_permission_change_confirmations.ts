import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';
export async function up(db: Kysely<Database>) {
  await db.schema
    .createTable('permission_change_confirmations')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('role_id', 'uuid', (c) => c.notNull().references('roles.id'))
    .addColumn('actor_id', 'uuid', (c) => c.notNull())
    .addColumn('reason', 'varchar(320)', (c) => c.notNull())
    .addColumn('before_permissions', 'jsonb', (c) => c.notNull())
    .addColumn('after_permissions', 'jsonb', (c) => c.notNull())
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('confirmed'))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .execute();
}
export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('permission_change_confirmations').ifExists().execute();
}
