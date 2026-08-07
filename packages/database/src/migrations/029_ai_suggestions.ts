import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';
const now = sql`now()`;
export async function up(db: Kysely<Database>) {
  await db.schema
    .createTable('ai_suggestions')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('title', 'varchar(200)', (c) => c.notNull())
    .addColumn('reason', 'varchar(1000)', (c) => c.notNull())
    .addColumn('impact', 'varchar(320)', (c) => c.notNull())
    .addColumn('action_type', 'varchar(64)', (c) => c.notNull())
    .addColumn('action_payload', 'jsonb', (c) => c.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn('model_name', 'varchar(120)', (c) => c.notNull())
    .addColumn('model_version', 'varchar(80)', (c) => c.notNull())
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('pending'))
    .addColumn('feedback', 'varchar(500)')
    .addColumn('accepted_by', 'uuid')
    .addColumn('accepted_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .execute();
  await db.schema
    .createIndex('ai_suggestions_tenant_status_idx')
    .ifNotExists()
    .on('ai_suggestions')
    .columns(['tenant_id', 'status', 'created_at'])
    .execute();
}
export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('ai_suggestions').ifExists().execute();
}
