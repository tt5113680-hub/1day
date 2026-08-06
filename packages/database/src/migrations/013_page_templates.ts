import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;

export async function up(db: Kysely<Database>) {
  await db.schema
    .createTable('page_templates')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('code', 'varchar(80)', (c) => c.notNull())
    .addColumn('name', 'varchar(120)', (c) => c.notNull())
    .addColumn('target', 'varchar(32)', (c) => c.notNull())
    .addColumn('published_version_id', 'uuid')
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('active'))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .addUniqueConstraint('page_templates_tenant_code_key', ['tenant_id', 'code'])
    .execute();
  await db.schema
    .createTable('page_template_versions')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('template_id', 'uuid', (c) => c.notNull().references('page_templates.id'))
    .addColumn('sequence', 'integer', (c) => c.notNull())
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('draft'))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .addUniqueConstraint('page_template_versions_template_sequence_key', [
      'template_id',
      'sequence',
    ])
    .execute();
  await db.schema
    .createTable('page_modules')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('template_version_id', 'uuid', (c) =>
      c.notNull().references('page_template_versions.id'),
    )
    .addColumn('module_type', 'varchar(48)', (c) => c.notNull())
    .addColumn('position', 'integer', (c) => c.notNull())
    .addColumn('config', 'jsonb', (c) => c.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('active'))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .addUniqueConstraint('page_modules_version_position_key', ['template_version_id', 'position'])
    .execute();
  for (const [table, columns] of [
    ['page_templates', ['tenant_id', 'target']],
    ['page_template_versions', ['tenant_id', 'template_id', 'status']],
    ['page_modules', ['tenant_id', 'template_version_id', 'position']],
  ] as const)
    await db.schema
      .createIndex(`${table}_tenant_lookup_idx`)
      .ifNotExists()
      .on(table)
      .columns([...columns])
      .execute();
}

export async function down(db: Kysely<Database>) {
  for (const table of ['page_modules', 'page_template_versions', 'page_templates'] as const)
    await db.schema.dropTable(table).ifExists().execute();
}
