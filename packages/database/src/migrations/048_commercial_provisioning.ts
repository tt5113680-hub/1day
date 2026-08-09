import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;

const lifecycle = <T extends ReturnType<Kysely<Database>['schema']['createTable']>>(table: T) =>
  table
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (column) => column.notNull().defaultTo(1));

export async function up(db: Kysely<Database>) {
  await lifecycle(
    db.schema
      .createTable('tenant_provisioning_runs')
      .addColumn('id', 'uuid', (column) => column.primaryKey())
      .addColumn('requested_by_tenant_id', 'uuid', (column) =>
        column.notNull().references('tenants.id'),
      )
      .addColumn('tenant_id', 'uuid', (column) => column.references('tenants.id'))
      .addColumn('source_mode', 'varchar(32)', (column) => column.notNull())
      .addColumn('request_slug', 'varchar(80)', (column) => column.notNull())
      .addColumn('idempotency_key', 'varchar(200)', (column) => column.notNull())
      .addColumn('state', 'varchar(32)', (column) => column.notNull().defaultTo('draft'))
      .addColumn('industry', 'varchar(32)', (column) => column.notNull())
      .addColumn('plan', 'varchar(32)', (column) => column.notNull())
      .addColumn('input', 'jsonb', (column) => column.notNull())
      .addColumn('delivery', 'jsonb', (column) => column.notNull().defaultTo(sql`'{}'::jsonb`))
      .addColumn('verification', 'jsonb', (column) => column.notNull().defaultTo(sql`'{}'::jsonb`))
      .addColumn('correlation_id', 'uuid', (column) => column.notNull())
      .addColumn('error_code', 'varchar(80)')
      .addColumn('error_detail', 'varchar(1000)')
      .addColumn('ready_at', 'timestamptz')
      .addUniqueConstraint('tenant_provisioning_runs_request_key', [
        'requested_by_tenant_id',
        'idempotency_key',
      ]),
  ).execute();
  await db.schema
    .createIndex('tenant_provisioning_runs_state_idx')
    .on('tenant_provisioning_runs')
    .columns(['state', 'created_at'])
    .execute();

  await lifecycle(
    db.schema
      .createTable('tenant_provisioning_steps')
      .addColumn('id', 'uuid', (column) => column.primaryKey())
      .addColumn('run_id', 'uuid', (column) =>
        column.notNull().references('tenant_provisioning_runs.id'),
      )
      .addColumn('step_code', 'varchar(64)', (column) => column.notNull())
      .addColumn('position', 'integer', (column) => column.notNull())
      .addColumn('state', 'varchar(32)', (column) => column.notNull().defaultTo('pending'))
      .addColumn('attempts', 'integer', (column) => column.notNull().defaultTo(0))
      .addColumn('started_at', 'timestamptz')
      .addColumn('ended_at', 'timestamptz')
      .addColumn('error_code', 'varchar(80)')
      .addColumn('output', 'jsonb', (column) => column.notNull().defaultTo(sql`'{}'::jsonb`))
      .addUniqueConstraint('tenant_provisioning_steps_run_code_key', ['run_id', 'step_code']),
  ).execute();

  await lifecycle(
    db.schema
      .createTable('storefront_bindings')
      .addColumn('id', 'uuid', (column) => column.primaryKey())
      .addColumn('tenant_id', 'uuid', (column) => column.notNull().references('tenants.id'))
      .addColumn('store_id', 'uuid', (column) => column.notNull().references('stores.id'))
      .addColumn('template_id', 'uuid', (column) =>
        column.notNull().references('page_templates.id'),
      )
      .addColumn('draft_version_id', 'uuid', (column) =>
        column.references('page_template_versions.id'),
      )
      .addColumn('live_version_id', 'uuid', (column) =>
        column.references('page_template_versions.id'),
      )
      .addColumn('status', 'varchar(32)', (column) => column.notNull().defaultTo('active'))
      .addColumn('published_at', 'timestamptz')
      .addUniqueConstraint('storefront_bindings_store_key', ['store_id']),
  ).execute();
  await db.schema
    .createIndex('storefront_bindings_tenant_live_idx')
    .on('storefront_bindings')
    .columns(['tenant_id', 'status', 'live_version_id'])
    .execute();

  await lifecycle(
    db.schema
      .createTable('storefront_publications')
      .addColumn('id', 'uuid', (column) => column.primaryKey())
      .addColumn('tenant_id', 'uuid', (column) => column.notNull().references('tenants.id'))
      .addColumn('binding_id', 'uuid', (column) =>
        column.notNull().references('storefront_bindings.id'),
      )
      .addColumn('template_version_id', 'uuid', (column) =>
        column.notNull().references('page_template_versions.id'),
      )
      .addColumn('publication_type', 'varchar(32)', (column) => column.notNull())
      .addColumn('sequence', 'integer', (column) => column.notNull())
      .addColumn('correlation_id', 'uuid', (column) => column.notNull())
      .addUniqueConstraint('storefront_publications_binding_sequence_key', [
        'binding_id',
        'sequence',
      ]),
  ).execute();

  await lifecycle(
    db.schema
      .createTable('membership_enrollments')
      .addColumn('id', 'uuid', (column) => column.primaryKey())
      .addColumn('tenant_id', 'uuid', (column) => column.notNull().references('tenants.id'))
      .addColumn('customer_id', 'uuid', (column) => column.notNull().references('customers.id'))
      .addColumn('store_id', 'uuid', (column) => column.references('stores.id'))
      .addColumn('tier', 'varchar(48)', (column) => column.notNull().defaultTo('member'))
      .addColumn('enrollment_status', 'varchar(32)', (column) =>
        column.notNull().defaultTo('pending'),
      )
      .addColumn('source', 'varchar(160)')
      .addColumn('joined_at', 'timestamptz')
      .addColumn('suspended_at', 'timestamptz')
      .addColumn('cancelled_at', 'timestamptz')
      .addUniqueConstraint('membership_enrollments_tenant_customer_key', [
        'tenant_id',
        'customer_id',
      ]),
  ).execute();

  await lifecycle(
    db.schema
      .createTable('member_benefit_ledger')
      .addColumn('id', 'uuid', (column) => column.primaryKey())
      .addColumn('tenant_id', 'uuid', (column) => column.notNull().references('tenants.id'))
      .addColumn('enrollment_id', 'uuid', (column) =>
        column.notNull().references('membership_enrollments.id'),
      )
      .addColumn('benefit_id', 'uuid', (column) => column.notNull().references('store_benefits.id'))
      .addColumn('store_id', 'uuid', (column) => column.references('stores.id'))
      .addColumn('entry_type', 'varchar(32)', (column) => column.notNull())
      .addColumn('quantity', 'integer', (column) => column.notNull().defaultTo(1))
      .addColumn('balance_after', 'integer', (column) => column.notNull())
      .addColumn('business_reference', 'varchar(160)', (column) => column.notNull())
      .addColumn('occurred_at', 'timestamptz', (column) => column.notNull().defaultTo(now))
      .addUniqueConstraint('member_benefit_ledger_business_key', [
        'tenant_id',
        'business_reference',
      ]),
  ).execute();

  await lifecycle(
    db.schema
      .createTable('one_code_entries')
      .addColumn('id', 'uuid', (column) => column.primaryKey())
      .addColumn('tenant_id', 'uuid', (column) => column.notNull().references('tenants.id'))
      .addColumn('store_id', 'uuid', (column) => column.references('stores.id'))
      .addColumn('code', 'varchar(48)', (column) => column.notNull().unique())
      .addColumn('scene', 'varchar(48)', (column) => column.notNull())
      .addColumn('source', 'varchar(160)', (column) => column.notNull())
      .addColumn('target_path', 'varchar(500)', (column) => column.notNull())
      .addColumn('role_targets', 'jsonb', (column) => column.notNull().defaultTo(sql`'{}'::jsonb`))
      .addColumn('status', 'varchar(32)', (column) => column.notNull().defaultTo('active'))
      .addColumn('expires_at', 'timestamptz'),
  ).execute();
  await db.schema
    .createIndex('one_code_entries_tenant_store_idx')
    .on('one_code_entries')
    .columns(['tenant_id', 'store_id', 'status'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  for (const table of [
    'one_code_entries',
    'member_benefit_ledger',
    'membership_enrollments',
    'storefront_publications',
    'storefront_bindings',
    'tenant_provisioning_steps',
    'tenant_provisioning_runs',
  ] as const) {
    await db.schema.dropTable(table).ifExists().execute();
  }
}
