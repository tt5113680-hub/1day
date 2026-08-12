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

/**
 * W∞-108: portal (employee H5 / management PC) publication ledger parity.
 * Mirrors `storefront_publications` so every non-store portal template
 * publish/rollback records an auditable, versioned publication trail
 * (publication_type + per-binding sequence + template_version_id + correlation_id).
 * Dead-letter replay / outbox consumers can correlate each portal publication.
 */
export async function up(db: Kysely<Database>) {
  await lifecycle(
    db.schema
      .createTable('portal_publications')
      .addColumn('id', 'uuid', (column) => column.primaryKey())
      .addColumn('tenant_id', 'uuid', (column) => column.notNull().references('tenants.id'))
      .addColumn('binding_id', 'uuid', (column) =>
        column.notNull().references('portal_bindings.id'),
      )
      .addColumn('template_version_id', 'uuid', (column) =>
        column.notNull().references('page_template_versions.id'),
      )
      .addColumn('publication_type', 'varchar(32)', (column) => column.notNull())
      .addColumn('sequence', 'integer', (column) => column.notNull())
      .addColumn('correlation_id', 'uuid', (column) => column.notNull())
      .addUniqueConstraint('portal_publications_binding_sequence_key', ['binding_id', 'sequence']),
  ).execute();
  await db.schema
    .createIndex('portal_publications_tenant_lookup_idx')
    .ifNotExists()
    .on('portal_publications')
    .columns(['tenant_id', 'binding_id', 'created_at'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('portal_publications').ifExists().execute();
}
