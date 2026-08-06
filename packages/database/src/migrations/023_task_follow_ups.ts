import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';
const now = sql`now()`;
export async function up(db: Kysely<Database>) {
  await db.schema
    .createTable('task_follow_ups')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('task_id', 'uuid', (c) => c.notNull().references('tasks.id'))
    .addColumn('employee_id', 'uuid', (c) => c.notNull().references('employees.id'))
    .addColumn('action_type', 'varchar(32)', (c) => c.notNull())
    .addColumn('raw_note', 'varchar(4000)')
    .addColumn('voice_transcript', 'varchar(4000)')
    .addColumn('summary', 'varchar(2000)')
    .addColumn('next_task_id', 'uuid')
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .execute();
  await db.schema
    .createIndex('task_follow_ups_tenant_task_idx')
    .ifNotExists()
    .on('task_follow_ups')
    .columns(['tenant_id', 'task_id'])
    .execute();
}
export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('task_follow_ups').ifExists().execute();
}
