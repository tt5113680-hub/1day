import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;

export async function up(db: Kysely<Database>) {
  await db.schema
    .createTable('employee_share_codes')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('employee_id', 'uuid', (c) => c.notNull().references('employees.id'))
    .addColumn('code', 'varchar(48)', (c) => c.notNull())
    .addColumn('scenario', 'varchar(32)', (c) => c.notNull())
    .addColumn('target_path', 'varchar(300)', (c) => c.notNull())
    .addColumn('expires_at', 'timestamptz')
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('active'))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .addUniqueConstraint('employee_share_codes_tenant_code_unique', ['tenant_id', 'code'])
    .execute();
  await db.schema
    .createIndex('employee_share_codes_tenant_employee_idx')
    .ifNotExists()
    .on('employee_share_codes')
    .columns(['tenant_id', 'employee_id'])
    .execute();

  await db.schema
    .createTable('employee_share_code_events')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('share_code_id', 'uuid', (c) => c.notNull().references('employee_share_codes.id'))
    .addColumn('event_type', 'varchar(32)', (c) => c.notNull())
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .execute();
  await db.schema
    .createIndex('employee_share_code_events_tenant_code_idx')
    .ifNotExists()
    .on('employee_share_code_events')
    .columns(['tenant_id', 'share_code_id'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('employee_share_code_events').ifExists().execute();
  await db.schema.dropTable('employee_share_codes').ifExists().execute();
}
