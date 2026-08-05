import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;

export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .createTable('organizations')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('code', 'varchar(80)', (c) => c.notNull())
    .addColumn('name', 'varchar(160)', (c) => c.notNull())
    .addColumn('organization_type', 'varchar(80)', (c) => c.notNull())
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('active'))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .addUniqueConstraint('organizations_tenant_code_unique', ['tenant_id', 'code'])
    .execute();

  await db.schema
    .createTable('organization_relations')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('parent_organization_id', 'uuid', (c) => c.notNull().references('organizations.id'))
    .addColumn('child_organization_id', 'uuid', (c) => c.notNull().references('organizations.id'))
    .addColumn('relation_type', 'varchar(80)', (c) => c.notNull().defaultTo('contains'))
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('active'))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .addUniqueConstraint('organization_relations_parent_child_unique', [
      'parent_organization_id',
      'child_organization_id',
    ])
    .execute();

  await db.schema
    .createTable('merchants')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('organization_id', 'uuid', (c) => c.notNull().references('organizations.id'))
    .addColumn('code', 'varchar(80)', (c) => c.notNull())
    .addColumn('name', 'varchar(160)', (c) => c.notNull())
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('active'))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .addUniqueConstraint('merchants_tenant_code_unique', ['tenant_id', 'code'])
    .execute();

  await db.schema
    .createTable('stores')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('organization_id', 'uuid', (c) => c.notNull().references('organizations.id'))
    .addColumn('merchant_id', 'uuid', (c) => c.notNull().references('merchants.id'))
    .addColumn('code', 'varchar(80)', (c) => c.notNull())
    .addColumn('name', 'varchar(160)', (c) => c.notNull())
    .addColumn('address', 'varchar(320)')
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('active'))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .addUniqueConstraint('stores_tenant_code_unique', ['tenant_id', 'code'])
    .execute();

  await db.schema
    .createTable('idempotency_keys')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('resource_type', 'varchar(80)', (c) => c.notNull())
    .addColumn('idempotency_key', 'varchar(200)', (c) => c.notNull())
    .addColumn('response', 'jsonb', (c) => c.notNull())
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('completed'))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .addUniqueConstraint('idempotency_keys_tenant_resource_key_unique', [
      'tenant_id',
      'resource_type',
      'idempotency_key',
    ])
    .execute();

  for (const [table, column] of [
    ['organizations', 'tenant_id'],
    ['organization_relations', 'tenant_id'],
    ['merchants', 'tenant_id'],
    ['stores', 'tenant_id'],
    ['idempotency_keys', 'tenant_id'],
  ] as const) {
    await db.schema
      .createIndex(`${table}_${column}_idx`)
      .ifNotExists()
      .on(table)
      .column(column)
      .execute();
  }
}

export async function down(db: Kysely<Database>): Promise<void> {
  for (const table of [
    'idempotency_keys',
    'stores',
    'merchants',
    'organization_relations',
    'organizations',
  ] as const)
    await db.schema.dropTable(table).ifExists().execute();
}
