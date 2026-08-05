import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;

export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .createTable('tenants')
    .ifNotExists()
    .addColumn('id', 'uuid', (column) => column.primaryKey())
    .addColumn('slug', 'varchar(80)', (column) => column.notNull().unique())
    .addColumn('name', 'varchar(160)', (column) => column.notNull())
    .addColumn('status', 'varchar(32)', (column) => column.notNull().defaultTo('active'))
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (column) => column.notNull().defaultTo(1))
    .execute();

  await db.schema
    .createTable('users')
    .ifNotExists()
    .addColumn('id', 'uuid', (column) => column.primaryKey())
    .addColumn('email', 'varchar(320)', (column) => column.notNull().unique())
    .addColumn('display_name', 'varchar(160)', (column) => column.notNull())
    .addColumn('password_hash', 'varchar(255)')
    .addColumn('status', 'varchar(32)', (column) => column.notNull().defaultTo('active'))
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (column) => column.notNull().defaultTo(1))
    .execute();

  await db.schema
    .createTable('memberships')
    .ifNotExists()
    .addColumn('id', 'uuid', (column) => column.primaryKey())
    .addColumn('tenant_id', 'uuid', (column) => column.notNull().references('tenants.id'))
    .addColumn('user_id', 'uuid', (column) => column.notNull().references('users.id'))
    .addColumn('status', 'varchar(32)', (column) => column.notNull().defaultTo('active'))
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (column) => column.notNull().defaultTo(1))
    .addUniqueConstraint('memberships_tenant_user_unique', ['tenant_id', 'user_id'])
    .execute();

  await db.schema
    .createTable('roles')
    .ifNotExists()
    .addColumn('id', 'uuid', (column) => column.primaryKey())
    .addColumn('tenant_id', 'uuid', (column) => column.notNull().references('tenants.id'))
    .addColumn('code', 'varchar(80)', (column) => column.notNull())
    .addColumn('name', 'varchar(160)', (column) => column.notNull())
    .addColumn('status', 'varchar(32)', (column) => column.notNull().defaultTo('active'))
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (column) => column.notNull().defaultTo(1))
    .addUniqueConstraint('roles_tenant_code_unique', ['tenant_id', 'code'])
    .execute();

  await db.schema
    .createTable('permissions')
    .ifNotExists()
    .addColumn('id', 'uuid', (column) => column.primaryKey())
    .addColumn('code', 'varchar(120)', (column) => column.notNull().unique())
    .addColumn('description', 'varchar(255)', (column) => column.notNull())
    .addColumn('status', 'varchar(32)', (column) => column.notNull().defaultTo('active'))
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (column) => column.notNull().defaultTo(1))
    .execute();

  await db.schema
    .createTable('role_permissions')
    .ifNotExists()
    .addColumn('id', 'uuid', (column) => column.primaryKey())
    .addColumn('tenant_id', 'uuid', (column) => column.notNull().references('tenants.id'))
    .addColumn('role_id', 'uuid', (column) => column.notNull().references('roles.id'))
    .addColumn('permission_id', 'uuid', (column) => column.notNull().references('permissions.id'))
    .addColumn('status', 'varchar(32)', (column) => column.notNull().defaultTo('active'))
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (column) => column.notNull().defaultTo(1))
    .addUniqueConstraint('role_permissions_role_permission_unique', ['role_id', 'permission_id'])
    .execute();

  await db.schema
    .createTable('data_scopes')
    .ifNotExists()
    .addColumn('id', 'uuid', (column) => column.primaryKey())
    .addColumn('tenant_id', 'uuid', (column) => column.notNull().references('tenants.id'))
    .addColumn('membership_id', 'uuid', (column) => column.notNull().references('memberships.id'))
    .addColumn('scope_type', 'varchar(80)', (column) => column.notNull())
    .addColumn('scope_value', 'varchar(255)', (column) => column.notNull())
    .addColumn('status', 'varchar(32)', (column) => column.notNull().defaultTo('active'))
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (column) => column.notNull().defaultTo(1))
    .addUniqueConstraint('data_scopes_membership_type_value_unique', [
      'membership_id',
      'scope_type',
      'scope_value',
    ])
    .execute();

  await db.schema
    .createTable('outbox_events')
    .ifNotExists()
    .addColumn('id', 'uuid', (column) => column.primaryKey())
    .addColumn('tenant_id', 'uuid', (column) => column.notNull().references('tenants.id'))
    .addColumn('event_type', 'varchar(160)', (column) => column.notNull())
    .addColumn('aggregate_type', 'varchar(120)', (column) => column.notNull())
    .addColumn('aggregate_id', 'uuid', (column) => column.notNull())
    .addColumn('payload', 'jsonb', (column) => column.notNull())
    .addColumn('correlation_id', 'uuid', (column) => column.notNull())
    .addColumn('trace_id', 'varchar(128)', (column) => column.notNull())
    .addColumn('status', 'varchar(32)', (column) => column.notNull().defaultTo('pending'))
    .addColumn('attempts', 'integer', (column) => column.notNull().defaultTo(0))
    .addColumn('available_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
    .addColumn('published_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (column) => column.notNull().defaultTo(1))
    .execute();

  await db.schema
    .createTable('audit_logs')
    .ifNotExists()
    .addColumn('id', 'uuid', (column) => column.primaryKey())
    .addColumn('tenant_id', 'uuid', (column) => column.notNull().references('tenants.id'))
    .addColumn('actor_id', 'uuid')
    .addColumn('action', 'varchar(160)', (column) => column.notNull())
    .addColumn('resource_type', 'varchar(120)', (column) => column.notNull())
    .addColumn('resource_id', 'uuid', (column) => column.notNull())
    .addColumn('correlation_id', 'uuid', (column) => column.notNull())
    .addColumn('trace_id', 'varchar(128)', (column) => column.notNull())
    .addColumn('details', 'jsonb', (column) => column.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn('status', 'varchar(32)', (column) => column.notNull().defaultTo('recorded'))
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (column) => column.notNull().defaultTo(1))
    .execute();

  for (const [table, column] of [
    ['memberships', 'tenant_id'],
    ['roles', 'tenant_id'],
    ['role_permissions', 'tenant_id'],
    ['data_scopes', 'tenant_id'],
    ['outbox_events', 'tenant_id'],
    ['audit_logs', 'tenant_id'],
  ] as const) {
    await db.schema
      .createIndex(`${table}_${column}_idx`)
      .ifNotExists()
      .on(table)
      .column(column)
      .execute();
  }
  await db.schema
    .createIndex('outbox_events_dispatch_idx')
    .ifNotExists()
    .on('outbox_events')
    .columns(['status', 'available_at'])
    .execute();
}

export async function down(db: Kysely<Database>): Promise<void> {
  for (const table of [
    'audit_logs',
    'outbox_events',
    'data_scopes',
    'role_permissions',
    'permissions',
    'roles',
    'memberships',
    'users',
    'tenants',
  ] as const) {
    await db.schema.dropTable(table).ifExists().execute();
  }
}
