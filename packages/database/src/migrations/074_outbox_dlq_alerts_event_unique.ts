import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

/** Repair 073 installs that created a non-unique outbox_event_id index (ON CONFLICT requires UNIQUE). */
export async function up(db: Kysely<Database>) {
  await sql`drop index if exists outbox_dlq_alerts_event_idx`.execute(db);
  await db.schema
    .createIndex('outbox_dlq_alerts_event_idx')
    .ifNotExists()
    .on('outbox_dlq_alerts')
    .column('outbox_event_id')
    .unique()
    .execute();
}

export async function down(db: Kysely<Database>) {
  await sql`drop index if exists outbox_dlq_alerts_event_idx`.execute(db);
  await db.schema
    .createIndex('outbox_dlq_alerts_event_idx')
    .ifNotExists()
    .on('outbox_dlq_alerts')
    .column('outbox_event_id')
    .execute();
}
