import type { Kysely } from 'kysely';
import type { Database } from '../types.js';

export async function up(db: Kysely<Database>) {
  await db.schema.alterTable('outbox_events').addColumn('last_error', 'varchar(1000)').execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.alterTable('outbox_events').dropColumn('last_error').execute();
}
