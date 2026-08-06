import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;

export async function up(db: Kysely<Database>) {
  await db.schema
    .createTable('tasks')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('customer_id', 'uuid')
    .addColumn('assignee_employee_id', 'uuid', (c) => c.notNull().references('employees.id'))
    .addColumn('title', 'varchar(160)', (c) => c.notNull())
    .addColumn('due_at', 'timestamptz', (c) => c.notNull())
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('open'))
    .addColumn('escalation_level', 'integer', (c) => c.notNull().defaultTo(0))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .execute();
  await db.schema
    .createTable('task_reminders')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('task_id', 'uuid', (c) => c.notNull().references('tasks.id'))
    .addColumn('remind_at', 'timestamptz', (c) => c.notNull())
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('pending'))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .execute();
  await db.schema
    .createTable('notification_logs')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('task_id', 'uuid', (c) => c.notNull().references('tasks.id'))
    .addColumn('employee_id', 'uuid', (c) => c.notNull().references('employees.id'))
    .addColumn('notification_type', 'varchar(40)', (c) => c.notNull())
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('sent'))
    .addColumn('sent_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .execute();
  for (const [table, columns] of [
    ['tasks', ['tenant_id', 'due_at']],
    ['task_reminders', ['tenant_id', 'remind_at', 'status']],
    ['notification_logs', ['tenant_id', 'task_id']],
  ] as const)
    await db.schema
      .createIndex(`${table}_dispatch_idx`)
      .ifNotExists()
      .on(table)
      .columns([...columns])
      .execute();
}

export async function down(db: Kysely<Database>) {
  for (const table of ['notification_logs', 'task_reminders', 'tasks'] as const)
    await db.schema.dropTable(table).ifExists().execute();
}
