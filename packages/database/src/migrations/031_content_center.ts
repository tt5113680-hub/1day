import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';
const now = sql`now()`;
export async function up(db: Kysely<Database>) {
  await db.schema
    .createTable('content_items')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('kind', 'varchar(32)', (c) => c.notNull())
    .addColumn('title', 'varchar(200)', (c) => c.notNull())
    .addColumn('body', 'text')
    .addColumn('media_url', 'varchar(500)')
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('draft'))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .execute();
  await db.schema
    .createTable('content_distributions')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('content_id', 'uuid', (c) => c.notNull().references('content_items.id'))
    .addColumn('channel', 'varchar(64)', (c) => c.notNull())
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('pending_authorization'))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .execute();
}
export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('content_distributions').ifExists().execute();
  await db.schema.dropTable('content_items').ifExists().execute();
}
