import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;

export async function up(db: Kysely<Database>) {
  await db.schema
    .createTable('employee_nurture_profiles')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('customer_id', 'uuid', (c) => c.notNull().references('customers.id'))
    .addColumn('employee_id', 'uuid', (c) => c.notNull().references('employees.id'))
    .addColumn('segment', 'varchar(32)', (c) => c.notNull().defaultTo('active'))
    .addColumn('next_touch_at', 'timestamptz')
    .addColumn('last_touch_at', 'timestamptz')
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('active'))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .addUniqueConstraint('employee_nurture_profiles_customer_unique', ['tenant_id', 'customer_id'])
    .execute();
  await db.schema
    .createTable('employee_nurture_touchpoints')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('profile_id', 'uuid', (c) => c.notNull().references('employee_nurture_profiles.id'))
    .addColumn('customer_id', 'uuid', (c) => c.notNull().references('customers.id'))
    .addColumn('employee_id', 'uuid', (c) => c.notNull().references('employees.id'))
    .addColumn('action_type', 'varchar(32)', (c) => c.notNull())
    .addColumn('note', 'varchar(2000)')
    .addColumn('task_id', 'uuid', (c) => c.references('tasks.id'))
    .addColumn('occurred_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .execute();
  await db.schema
    .createIndex('employee_nurture_profiles_employee_segment_idx')
    .ifNotExists()
    .on('employee_nurture_profiles')
    .columns(['tenant_id', 'employee_id', 'segment'])
    .execute();
  await db.schema
    .createIndex('employee_nurture_touchpoints_profile_idx')
    .ifNotExists()
    .on('employee_nurture_touchpoints')
    .columns(['tenant_id', 'profile_id', 'occurred_at'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('employee_nurture_touchpoints').ifExists().execute();
  await db.schema.dropTable('employee_nurture_profiles').ifExists().execute();
}
