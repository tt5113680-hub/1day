import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';
const now = sql`now()`;
export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .createTable('membership_invitations')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('organization_id', 'uuid', (c) => c.notNull().references('organizations.id'))
    .addColumn('email', 'varchar(320)', (c) => c.notNull())
    .addColumn('employee_code', 'varchar(80)', (c) => c.notNull())
    .addColumn('title', 'varchar(160)')
    .addColumn('token_hash', 'varchar(128)', (c) => c.notNull().unique())
    .addColumn('expires_at', 'timestamptz', (c) => c.notNull())
    .addColumn('accepted_at', 'timestamptz')
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('pending'))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .addUniqueConstraint('membership_invitations_tenant_email_pending_unique', [
      'tenant_id',
      'email',
      'status',
    ])
    .execute();
  await db.schema
    .createTable('employees')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('membership_id', 'uuid', (c) => c.notNull().references('memberships.id'))
    .addColumn('organization_id', 'uuid', (c) => c.notNull().references('organizations.id'))
    .addColumn('employee_code', 'varchar(80)', (c) => c.notNull())
    .addColumn('title', 'varchar(160)')
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('active'))
    .addColumn('started_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('ended_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .addUniqueConstraint('employees_tenant_code_unique', ['tenant_id', 'employee_code'])
    .addUniqueConstraint('employees_membership_unique', ['membership_id'])
    .execute();
  for (const table of ['membership_invitations', 'employees'] as const)
    await db.schema
      .createIndex(`${table}_tenant_id_idx`)
      .ifNotExists()
      .on(table)
      .column('tenant_id')
      .execute();
}
export async function down(db: Kysely<Database>): Promise<void> {
  await db.schema.dropTable('employees').ifExists().execute();
  await db.schema.dropTable('membership_invitations').ifExists().execute();
}
