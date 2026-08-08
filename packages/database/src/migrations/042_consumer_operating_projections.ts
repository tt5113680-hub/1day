import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;

export async function up(db: Kysely<Database>) {
  await db.schema
    .createTable('consumer_operating_projections')
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('consumer_event_type', 'varchar(64)', (c) => c.notNull())
    .addColumn('consumer_event_id', 'uuid', (c) => c.notNull())
    .addColumn('customer_id', 'uuid', (c) => c.notNull().references('customers.id'))
    .addColumn('customer_source_id', 'uuid', (c) => c.notNull().references('customer_sources.id'))
    .addColumn('ownership_id', 'uuid')
    .addColumn('task_id', 'uuid')
    .addColumn('lead_pool_entry_id', 'uuid')
    .addColumn('assignment_basis', 'varchar(48)', (c) => c.notNull())
    .addColumn('payload', 'jsonb', (c) => c.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .addUniqueConstraint('consumer_operating_projections_event_unique', [
      'tenant_id',
      'consumer_event_type',
      'consumer_event_id',
    ])
    .execute();
  await db.schema
    .createIndex('consumer_operating_projections_tenant_customer_idx')
    .on('consumer_operating_projections')
    .columns(['tenant_id', 'customer_id'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('consumer_operating_projections').ifExists().execute();
}
