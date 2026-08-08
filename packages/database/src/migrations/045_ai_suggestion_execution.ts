import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

export async function up(db: Kysely<Database>) {
  await db.schema
    .alterTable('ai_suggestions')
    .addColumn('execution_status', 'varchar(32)', (column) =>
      column.notNull().defaultTo('not_requested'),
    )
    .addColumn('execution_result', 'jsonb', (column) =>
      column.notNull().defaultTo(sql.raw("'{}'::jsonb")),
    )
    .addColumn('executed_at', 'timestamptz')
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema
    .alterTable('ai_suggestions')
    .dropColumn('executed_at')
    .dropColumn('execution_result')
    .dropColumn('execution_status')
    .execute();
}
