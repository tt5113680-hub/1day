import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

export async function up(db: Kysely<Database>) {
  await db.schema
    .alterTable('store_service_platform_offers')
    .addColumn('currency', 'varchar(3)', (column) => column.notNull().defaultTo('CNY'))
    .addColumn('price_source', 'varchar(160)', (column) => column.notNull().defaultTo('merchant'))
    .addColumn('source_updated_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema
    .alterTable('store_service_platform_offers')
    .dropColumn('source_updated_at')
    .dropColumn('price_source')
    .dropColumn('currency')
    .execute();
}
