import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;

export async function up(db: Kysely<Database>) {
  await db.schema
    .createTable('employee_notifications')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('employee_id', 'uuid', (c) => c.notNull().references('employees.id'))
    .addColumn('category', 'varchar(32)', (c) => c.notNull())
    .addColumn('source_type', 'varchar(64)', (c) => c.notNull())
    .addColumn('source_id', 'uuid', (c) => c.notNull())
    .addColumn('title', 'varchar(160)', (c) => c.notNull())
    .addColumn('body', 'varchar(1000)', (c) => c.notNull())
    .addColumn('deep_link', 'varchar(320)')
    .addColumn('sent_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('read_at', 'timestamptz')
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('active'))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .addUniqueConstraint('employee_notifications_source_unique', [
      'tenant_id',
      'employee_id',
      'source_type',
      'source_id',
    ])
    .execute();
  await db.schema
    .createIndex('employee_notifications_inbox_idx')
    .ifNotExists()
    .on('employee_notifications')
    .columns(['tenant_id', 'employee_id', 'read_at', 'sent_at'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('employee_notifications').ifExists().execute();
}
