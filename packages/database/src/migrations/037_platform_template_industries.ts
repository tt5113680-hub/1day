import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

export async function up(db: Kysely<Database>) {
  await db.schema
    .alterTable('page_templates')
    .addColumn('industry_config', 'jsonb', (c) => c.notNull().defaultTo(sql`'{}'::jsonb`))
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.alterTable('page_templates').dropColumn('industry_config').execute();
}
