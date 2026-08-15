import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;

/**
 * W∞-129 — Worker heartbeats for READY verification (SPEC §7).
 *
 * Worker ticks upsert a single row so provisioning can assert
 * `worker_health_recent` without calling an external HTTP health URL.
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
      .createTable('worker_heartbeats')
      .ifNotExists()
      .addColumn('id', 'uuid', (column) => column.primaryKey())
      .addColumn('service_name', 'varchar(64)', (column) => column.notNull().unique())
      .addColumn('status', 'varchar(32)', (column) => column.notNull().defaultTo('ok'))
      .addColumn('last_run_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
      .addColumn('last_error', 'varchar(1000)')
      .addColumn('payload', 'jsonb', (column) => column.notNull().defaultTo(sql`'{}'::jsonb`)),
  ).execute();
  await db.schema
    .createIndex('worker_heartbeats_service_run_idx')
    .ifNotExists()
    .on('worker_heartbeats')
    .columns(['service_name', 'last_run_at'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropIndex('worker_heartbeats_service_run_idx').ifExists().execute();
  await db.schema.dropTable('worker_heartbeats').ifExists().execute();
}
