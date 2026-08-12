import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;

/**
 * W∞-107: workbench queue one-click disposition.
 * Tenant-scoped record of whether a management dashboard queue item
 * (overdue task / ownership approval / consult / lead) was `handled`
 * or `ignored` by the tenant owner (early-meeting one-click disposition).
 */
export async function up(db: Kysely<Database>) {
  await db.schema
    .createTable('management_queue_dispositions')
    .addColumn('id', 'uuid', (column) => column.primaryKey())
    .addColumn('tenant_id', 'uuid', (column) => column.notNull().references('tenants.id'))
    .addColumn('queue_type', 'varchar(40)', (column) => column.notNull())
    .addColumn('source_id', 'uuid', (column) => column.notNull())
    .addColumn('status', 'varchar(32)', (column) => column.notNull())
    .addColumn('deep_link', 'varchar(320)')
    .addColumn('title', 'varchar(320)')
    .addColumn('disposition_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
    .addColumn('disposed_by', 'uuid')
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (column) => column.notNull().defaultTo(1))
    .addUniqueConstraint('mgmt_queue_disposition_source_key', [
      'tenant_id',
      'queue_type',
      'source_id',
    ])
    .execute();
  await db.schema
    .createIndex('mgmt_queue_disposition_tenant_idx')
    .ifNotExists()
    .on('management_queue_dispositions')
    .columns(['tenant_id', 'queue_type', 'status', 'disposition_at'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('management_queue_dispositions').ifExists().execute();
}
