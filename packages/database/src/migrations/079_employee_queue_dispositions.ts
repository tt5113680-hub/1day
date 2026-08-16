import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;

/**
 * W∞-142: employee workbench / task-inbox queue one-click disposition.
 * Employee-scoped (tenant + employee) record of whether an employee queue item
 * (open_task / overdue_task / lead / share_code) was `handled` or `ignored` by
 * the employee on their own tool surface (queue disposable closed loop), with
 * handled-rate observable the same way the Management W107 disposition is.
 */
export async function up(db: Kysely<Database>) {
  await db.schema
    .createTable('employee_queue_dispositions')
    .addColumn('id', 'uuid', (column) => column.primaryKey())
    .addColumn('tenant_id', 'uuid', (column) => column.notNull().references('tenants.id'))
    .addColumn('employee_id', 'uuid', (column) => column.notNull().references('employees.id'))
    .addColumn('queue_type', 'varchar(40)', (column) => column.notNull())
    .addColumn('source_id', 'uuid', (column) => column.notNull())
    .addColumn('status', 'varchar(32)', (column) => column.notNull())
    .addColumn('deep_link', 'varchar(320)')
    .addColumn('title', 'varchar(320)')
    .addColumn('disposition_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
    .addColumn('disposed_by', 'uuid')
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (column) => column.notNull().defaultTo(1))
    .addUniqueConstraint('emp_queue_disposition_source_key', [
      'tenant_id',
      'employee_id',
      'queue_type',
      'source_id',
    ])
    .execute();
  await db.schema
    .createIndex('emp_queue_disposition_tenant_emp_idx')
    .ifNotExists()
    .on('employee_queue_dispositions')
    .columns(['tenant_id', 'employee_id', 'queue_type', 'status', 'disposition_at'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('employee_queue_dispositions').ifExists().execute();
}
