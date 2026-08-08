import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import type { Database } from '../types.js';

export async function up(db: Kysely<Database>) {
  await db.schema
    .createTable('rate_limit_windows')
    .addColumn('bucket', 'varchar(64)', (column) => column.notNull())
    .addColumn('subject_hash', 'varchar(128)', (column) => column.notNull())
    .addColumn('window_started_at', 'timestamptz', (column) => column.notNull())
    .addColumn('request_count', 'integer', (column) => column.notNull().defaultTo(0))
    .addColumn('expires_at', 'timestamptz', (column) => column.notNull())
    .addColumn('updated_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .addPrimaryKeyConstraint('rate_limit_windows_pkey', [
      'bucket',
      'subject_hash',
      'window_started_at',
    ])
    .execute();
  await db.schema
    .createIndex('rate_limit_windows_expires_at_idx')
    .on('rate_limit_windows')
    .column('expires_at')
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('rate_limit_windows').execute();
}
