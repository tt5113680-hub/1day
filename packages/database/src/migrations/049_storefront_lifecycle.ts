import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

export async function up(db: Kysely<Database>) {
  await db.schema
    .createTable('storefront_preview_tokens')
    .addColumn('id', 'uuid', (column) => column.primaryKey())
    .addColumn('tenant_id', 'uuid', (column) => column.notNull().references('tenants.id'))
    .addColumn('store_id', 'uuid', (column) => column.notNull().references('stores.id'))
    .addColumn('template_version_id', 'uuid', (column) =>
      column.notNull().references('page_template_versions.id'),
    )
    .addColumn('token_hash', 'varchar(128)', (column) => column.notNull().unique())
    .addColumn('expires_at', 'timestamptz', (column) => column.notNull())
    .addColumn('status', 'varchar(32)', (column) => column.notNull().defaultTo('active'))
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (column) => column.notNull().defaultTo(1))
    .execute();
  await db.schema
    .createIndex('storefront_preview_tokens_tenant_store_idx')
    .on('storefront_preview_tokens')
    .columns(['tenant_id', 'store_id', 'status', 'expires_at'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('storefront_preview_tokens').ifExists().execute();
}
