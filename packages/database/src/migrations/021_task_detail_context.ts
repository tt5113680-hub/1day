import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;

export async function up(db: Kysely<Database>) {
  await db.schema.alterTable('tasks').addColumn('reason', 'varchar(1000)').execute();
  await db.schema
    .createTable('task_evidence_links')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('task_id', 'uuid', (c) => c.notNull().references('tasks.id'))
    .addColumn('evidence_file_id', 'uuid', (c) => c.notNull().references('evidence_files.id'))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .addUniqueConstraint('task_evidence_links_unique', ['task_id', 'evidence_file_id'])
    .execute();
  await db.schema
    .createIndex('task_evidence_links_tenant_task_idx')
    .ifNotExists()
    .on('task_evidence_links')
    .columns(['tenant_id', 'task_id'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('task_evidence_links').ifExists().execute();
  await db.schema.alterTable('tasks').dropColumn('reason').execute();
}
