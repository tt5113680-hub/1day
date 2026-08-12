import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;

const lifecycle = <T extends ReturnType<Kysely<Database>['schema']['createTable']>>(table: T) =>
  table
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (column) => column.notNull().defaultTo(1));

/** Tenant-scoped portal layout bindings for employee H5 / management PC (non-store). */
export async function up(db: Kysely<Database>) {
  await lifecycle(
    db.schema
      .createTable('portal_bindings')
      .addColumn('id', 'uuid', (column) => column.primaryKey())
      .addColumn('tenant_id', 'uuid', (column) => column.notNull().references('tenants.id'))
      .addColumn('target', 'varchar(32)', (column) => column.notNull())
      .addColumn('template_id', 'uuid', (column) =>
        column.notNull().references('page_templates.id'),
      )
      .addColumn('draft_version_id', 'uuid', (column) =>
        column.references('page_template_versions.id'),
      )
      .addColumn('live_version_id', 'uuid', (column) =>
        column.references('page_template_versions.id'),
      )
      .addColumn('status', 'varchar(32)', (column) => column.notNull().defaultTo('active'))
      .addColumn('published_at', 'timestamptz')
      .addUniqueConstraint('portal_bindings_tenant_target_key', ['tenant_id', 'target']),
  ).execute();
  await db.schema
    .createIndex('portal_bindings_template_idx')
    .on('portal_bindings')
    .columns(['template_id', 'tenant_id'])
    .execute();

  await db.schema
    .createTable('portal_preview_tokens')
    .addColumn('id', 'uuid', (column) => column.primaryKey())
    .addColumn('tenant_id', 'uuid', (column) => column.notNull().references('tenants.id'))
    .addColumn('target', 'varchar(32)', (column) => column.notNull())
    .addColumn('template_version_id', 'uuid', (column) =>
      column.notNull().references('page_template_versions.id'),
    )
    .addColumn('token_hash', 'varchar(128)', (column) => column.notNull().unique())
    .addColumn('expires_at', 'timestamptz', (column) => column.notNull())
    .addColumn('status', 'varchar(32)', (column) => column.notNull().defaultTo('active'))
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (column) => column.notNull().defaultTo(1))
    .execute();
  await db.schema
    .createIndex('portal_preview_tokens_lookup_idx')
    .on('portal_preview_tokens')
    .columns(['tenant_id', 'target', 'status', 'expires_at'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('portal_preview_tokens').ifExists().execute();
  await db.schema.dropTable('portal_bindings').ifExists().execute();
}
