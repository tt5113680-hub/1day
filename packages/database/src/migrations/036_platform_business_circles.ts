import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;
const columns = (table: ReturnType<Kysely<Database>['schema']['createTable']>) =>
  table
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('active'))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1));

export async function up(db: Kysely<Database>) {
  await columns(
    db.schema
      .createTable('platform_business_circles')
      .ifNotExists()
      .addColumn('id', 'uuid', (c) => c.primaryKey())
      .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
      .addColumn('code', 'varchar(80)', (c) => c.notNull())
      .addColumn('name', 'varchar(160)', (c) => c.notNull())
      .addColumn('description', 'varchar(320)')
      .addUniqueConstraint('platform_business_circles_tenant_code_key', ['tenant_id', 'code']),
  ).execute();
  await columns(
    db.schema
      .createTable('platform_business_circle_merchants')
      .ifNotExists()
      .addColumn('id', 'uuid', (c) => c.primaryKey())
      .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
      .addColumn('circle_id', 'uuid', (c) => c.notNull().references('platform_business_circles.id'))
      .addColumn('merchant_tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
      .addColumn('benefits', 'jsonb', (c) => c.notNull().defaultTo(sql`'[]'::jsonb`))
      .addColumn('recommendation_reason', 'varchar(320)', (c) => c.notNull())
      .addColumn('approval_status', 'varchar(32)', (c) => c.notNull().defaultTo('pending'))
      .addColumn('approved_by', 'uuid')
      .addColumn('approved_at', 'timestamptz')
      .addUniqueConstraint('platform_business_circle_merchant_key', [
        'circle_id',
        'merchant_tenant_id',
      ]),
  ).execute();
  await db.schema
    .createIndex('platform_business_circle_merchants_lookup_idx')
    .ifNotExists()
    .on('platform_business_circle_merchants')
    .columns(['tenant_id', 'circle_id', 'approval_status'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('platform_business_circle_merchants').ifExists().execute();
  await db.schema.dropTable('platform_business_circles').ifExists().execute();
}
