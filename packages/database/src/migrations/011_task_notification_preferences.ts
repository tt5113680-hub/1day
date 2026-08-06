import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;

export async function up(db: Kysely<Database>) {
  await db.schema
    .createTable('employee_notification_preferences')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('employee_id', 'uuid', (c) => c.notNull().references('employees.id'))
    .addColumn('do_not_disturb_until', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .addUniqueConstraint('employee_notification_preferences_tenant_employee_key', [
      'tenant_id',
      'employee_id',
    ])
    .execute();
  await db.schema
    .createIndex('employee_notification_preferences_lookup_idx')
    .ifNotExists()
    .on('employee_notification_preferences')
    .columns(['tenant_id', 'employee_id'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('employee_notification_preferences').ifExists().execute();
}
