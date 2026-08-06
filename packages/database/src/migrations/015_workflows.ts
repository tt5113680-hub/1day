import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;
const auditColumns = (table: ReturnType<Kysely<Database>['schema']['createTable']>) =>
  table
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('active'))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1));

export async function up(db: Kysely<Database>) {
  await auditColumns(
    db.schema
      .createTable('workflow_definitions')
      .ifNotExists()
      .addColumn('id', 'uuid', (c) => c.primaryKey())
      .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
      .addColumn('code', 'varchar(80)', (c) => c.notNull())
      .addColumn('name', 'varchar(160)', (c) => c.notNull())
      .addColumn('published_version_id', 'uuid')
      .addUniqueConstraint('workflow_definitions_tenant_code_key', ['tenant_id', 'code']),
  ).execute();
  await auditColumns(
    db.schema
      .createTable('workflow_versions')
      .ifNotExists()
      .addColumn('id', 'uuid', (c) => c.primaryKey())
      .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
      .addColumn('definition_id', 'uuid', (c) => c.notNull().references('workflow_definitions.id'))
      .addColumn('sequence', 'integer', (c) => c.notNull())
      .addUniqueConstraint('workflow_versions_definition_sequence_key', [
        'definition_id',
        'sequence',
      ]),
  ).execute();
  await auditColumns(
    db.schema
      .createTable('workflow_steps')
      .ifNotExists()
      .addColumn('id', 'uuid', (c) => c.primaryKey())
      .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
      .addColumn('workflow_version_id', 'uuid', (c) =>
        c.notNull().references('workflow_versions.id'),
      )
      .addColumn('position', 'integer', (c) => c.notNull())
      .addColumn('name', 'varchar(160)', (c) => c.notNull())
      .addColumn('step_type', 'varchar(32)', (c) => c.notNull())
      .addColumn('assignee_employee_id', 'uuid', (c) => c.notNull().references('employees.id'))
      .addColumn('timeout_minutes', 'integer', (c) => c.notNull())
      .addColumn('condition', 'jsonb', (c) => c.notNull().defaultTo(sql`'{}'::jsonb`))
      .addUniqueConstraint('workflow_steps_version_position_key', [
        'workflow_version_id',
        'position',
      ]),
  ).execute();
  await auditColumns(
    db.schema
      .createTable('workflow_instances')
      .ifNotExists()
      .addColumn('id', 'uuid', (c) => c.primaryKey())
      .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
      .addColumn('definition_id', 'uuid', (c) => c.notNull().references('workflow_definitions.id'))
      .addColumn('workflow_version_id', 'uuid', (c) =>
        c.notNull().references('workflow_versions.id'),
      )
      .addColumn('context', 'jsonb', (c) => c.notNull().defaultTo(sql`'{}'::jsonb`))
      .addColumn('current_step_position', 'integer', (c) => c.notNull().defaultTo(0))
      .addColumn('started_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
      .addColumn('completed_at', 'timestamptz'),
  ).execute();
  await auditColumns(
    db.schema
      .createTable('workflow_instance_steps')
      .ifNotExists()
      .addColumn('id', 'uuid', (c) => c.primaryKey())
      .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
      .addColumn('workflow_instance_id', 'uuid', (c) =>
        c.notNull().references('workflow_instances.id'),
      )
      .addColumn('workflow_step_id', 'uuid', (c) => c.notNull().references('workflow_steps.id'))
      .addColumn('position', 'integer', (c) => c.notNull())
      .addColumn('name', 'varchar(160)', (c) => c.notNull())
      .addColumn('step_type', 'varchar(32)', (c) => c.notNull())
      .addColumn('assignee_employee_id', 'uuid', (c) => c.notNull().references('employees.id'))
      .addColumn('task_id', 'uuid', (c) => c.references('tasks.id'))
      .addColumn('due_at', 'timestamptz')
      .addColumn('completed_at', 'timestamptz')
      .addUniqueConstraint('workflow_instance_steps_instance_position_key', [
        'workflow_instance_id',
        'position',
      ]),
  ).execute();
  for (const [name, table, columns] of [
    ['workflow_definitions_tenant_idx', 'workflow_definitions', ['tenant_id', 'status']],
    ['workflow_instances_tenant_idx', 'workflow_instances', ['tenant_id', 'status']],
    [
      'workflow_instance_steps_due_idx',
      'workflow_instance_steps',
      ['tenant_id', 'status', 'due_at'],
    ],
  ] as const)
    await db.schema
      .createIndex(name)
      .ifNotExists()
      .on(table)
      .columns([...columns])
      .execute();
}

export async function down(db: Kysely<Database>) {
  for (const table of [
    'workflow_instance_steps',
    'workflow_instances',
    'workflow_steps',
    'workflow_versions',
    'workflow_definitions',
  ] as const)
    await db.schema.dropTable(table).ifExists().execute();
}
