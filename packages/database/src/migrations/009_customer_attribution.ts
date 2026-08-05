import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;

export async function up(db: Kysely<Database>) {
  await db.schema
    .createTable('customer_sources')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('customer_id', 'uuid', (c) => c.notNull().references('customers.id'))
    .addColumn('source_role', 'varchar(32)', (c) => c.notNull())
    .addColumn('source_type', 'varchar(80)', (c) => c.notNull())
    .addColumn('source_id', 'varchar(160)')
    .addColumn('metadata', 'jsonb', (c) => c.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('active'))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .execute();
  await db.schema
    .createTable('customer_ownerships')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('customer_id', 'uuid', (c) => c.notNull().references('customers.id'))
    .addColumn('employee_id', 'uuid', (c) => c.notNull().references('employees.id'))
    .addColumn('ownership_role', 'varchar(32)', (c) => c.notNull().defaultTo('owner'))
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('active'))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .execute();
  await db.schema
    .createTable('customer_contributions')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('customer_id', 'uuid', (c) => c.notNull().references('customers.id'))
    .addColumn('employee_id', 'uuid', (c) => c.notNull().references('employees.id'))
    .addColumn('contribution_role', 'varchar(32)', (c) => c.notNull())
    .addColumn('evidence_refs', 'jsonb', (c) => c.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn('confirmed', 'boolean', (c) => c.notNull().defaultTo(false))
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('active'))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .addUniqueConstraint('customer_contributions_unique_role_employee', [
      'tenant_id',
      'customer_id',
      'employee_id',
      'contribution_role',
    ])
    .execute();
  await db.schema
    .createTable('customer_ownership_transfer_approvals')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('customer_id', 'uuid', (c) => c.notNull().references('customers.id'))
    .addColumn('from_employee_id', 'uuid')
    .addColumn('to_employee_id', 'uuid', (c) => c.notNull().references('employees.id'))
    .addColumn('reason', 'varchar(320)', (c) => c.notNull())
    .addColumn('requested_version', 'integer', (c) => c.notNull())
    .addColumn('approved_by', 'uuid')
    .addColumn('approved_at', 'timestamptz')
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('pending'))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .execute();
  for (const [table, column] of [
    ['customer_sources', 'tenant_id'],
    ['customer_sources', 'customer_id'],
    ['customer_ownerships', 'tenant_id'],
    ['customer_ownerships', 'customer_id'],
    ['customer_contributions', 'tenant_id'],
    ['customer_contributions', 'customer_id'],
    ['customer_ownership_transfer_approvals', 'tenant_id'],
    ['customer_ownership_transfer_approvals', 'customer_id'],
  ] as const)
    await db.schema
      .createIndex(`${table}_${column}_idx`)
      .ifNotExists()
      .on(table)
      .column(column)
      .execute();
}

export async function down(db: Kysely<Database>) {
  for (const table of [
    'customer_ownership_transfer_approvals',
    'customer_contributions',
    'customer_ownerships',
    'customer_sources',
  ] as const)
    await db.schema.dropTable(table).ifExists().execute();
}
