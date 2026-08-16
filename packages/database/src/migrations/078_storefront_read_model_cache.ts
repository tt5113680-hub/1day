import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;

/**
 * W∞-131 — Storefront published read-model / cache version (SPEC §7).
 *
 * Warming a versioned cache row lets READY assert
 * `cache_version_consistent` against the live binding fingerprint
 * (bindingId:bindingVersion:liveVersionId) used by public sync ETag.
 */
const lifecycle = <T extends ReturnType<Kysely<Database>['schema']['createTable']>>(table: T) =>
  table
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (column) => column.notNull().defaultTo(1));

export async function up(db: Kysely<Database>) {
  await lifecycle(
    db.schema
      .createTable('storefront_read_model_cache')
      .ifNotExists()
      .addColumn('id', 'uuid', (column) => column.primaryKey())
      .addColumn('tenant_id', 'uuid', (column) =>
        column.notNull().references('tenants.id'),
      )
      .addColumn('store_id', 'uuid', (column) => column.notNull().references('stores.id'))
      .addColumn('binding_id', 'uuid', (column) =>
        column.notNull().references('storefront_bindings.id'),
      )
      .addColumn('live_version_id', 'uuid', (column) =>
        column.notNull().references('page_template_versions.id'),
      )
      .addColumn('binding_version', 'integer', (column) => column.notNull())
      .addColumn('published_version', 'varchar(160)', (column) => column.notNull())
      .addColumn('etag', 'varchar(80)', (column) => column.notNull())
      .addColumn('cache_version', 'integer', (column) => column.notNull().defaultTo(1))
      .addColumn('auth_epoch', 'integer', (column) => column.notNull().defaultTo(0))
      .addColumn('warmed_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
      .addColumn('correlation_id', 'uuid'),
  ).execute();
  await db.schema
    .createIndex('storefront_read_model_cache_store_uidx')
    .ifNotExists()
    .unique()
    .on('storefront_read_model_cache')
    .columns(['store_id'])
    .execute();
  await db.schema
    .createIndex('storefront_read_model_cache_tenant_binding_idx')
    .ifNotExists()
    .on('storefront_read_model_cache')
    .columns(['tenant_id', 'binding_id'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropIndex('storefront_read_model_cache_tenant_binding_idx').ifExists().execute();
  await db.schema.dropIndex('storefront_read_model_cache_store_uidx').ifExists().execute();
  await db.schema.dropTable('storefront_read_model_cache').ifExists().execute();
}
