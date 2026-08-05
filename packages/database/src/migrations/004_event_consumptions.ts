import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .createTable('event_consumptions')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('event_id', 'uuid', (c) => c.notNull())
    .addColumn('consumer_name', 'varchar(160)', (c) => c.notNull())
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('processed'))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addUniqueConstraint('event_consumptions_event_consumer_unique', ['event_id', 'consumer_name'])
    .execute();
}
export async function down(db: Kysely<Database>): Promise<void> {
  await db.schema.dropTable('event_consumptions').ifExists().execute();
}
