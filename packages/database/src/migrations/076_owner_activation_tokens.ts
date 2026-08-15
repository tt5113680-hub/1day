import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;

/**
 * W∞-127 — Owner activation token (§5 READY).
 *
 * One-time activation tokens so platform operators need not keep owner plaintext
 * passwords in the browser. Token mode leaves the run in awaiting_activation until
 * the owner sets a password via public activate API.
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
      .createTable('owner_activation_tokens')
      .ifNotExists()
      .addColumn('id', 'uuid', (column) => column.primaryKey())
      .addColumn('tenant_id', 'uuid', (column) => column.notNull().references('tenants.id'))
      .addColumn('run_id', 'uuid', (column) =>
        column.notNull().references('tenant_provisioning_runs.id'),
      )
      .addColumn('user_id', 'uuid', (column) => column.notNull().references('users.id'))
      .addColumn('one_code_entry_id', 'uuid', (column) => column.references('one_code_entries.id'))
      .addColumn('token_hash', 'varchar(128)', (column) => column.notNull().unique())
      .addColumn('status', 'varchar(32)', (column) => column.notNull().defaultTo('pending'))
      .addColumn('expires_at', 'timestamptz', (column) => column.notNull())
      .addColumn('used_at', 'timestamptz'),
  ).execute();
  await db.schema
    .createIndex('owner_activation_tokens_run_idx')
    .ifNotExists()
    .on('owner_activation_tokens')
    .columns(['run_id', 'status'])
    .execute();
  await db.schema
    .createIndex('owner_activation_tokens_tenant_idx')
    .ifNotExists()
    .on('owner_activation_tokens')
    .columns(['tenant_id', 'status'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('owner_activation_tokens').ifExists().execute();
}
