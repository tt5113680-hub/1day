import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

/**
 * TOOL-PHASE-2 — 商圈单独页双身份：
 * - business_circles 增加 LBS / 公开引流 / 行业标签
 * - business_circle_applications：经理邀约 + 商家申请
 * 不碰钱、不碰销售。
 */
export async function up(db: Kysely<Database>) {
  await db.schema
    .alterTable('business_circles')
    .addColumn('latitude', sql`numeric(9,6)`)
    .execute();
  await db.schema
    .alterTable('business_circles')
    .addColumn('longitude', sql`numeric(9,6)`)
    .execute();
  await db.schema
    .alterTable('business_circles')
    .addColumn('address_label', 'varchar(320)')
    .execute();
  await db.schema
    .alterTable('business_circles')
    .addColumn('industry_tag', 'varchar(80)')
    .execute();
  await db.schema
    .alterTable('business_circles')
    .addColumn('public_visible', 'boolean', (c) => c.notNull().defaultTo(false))
    .execute();

  await db.schema
    .createTable('business_circle_applications')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('business_circle_id', 'uuid', (c) =>
      c.notNull().references('business_circles.id'),
    )
    .addColumn('applicant_tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('source', 'varchar(16)', (c) => c.notNull())
    .addColumn('status', 'varchar(32)', (c) => c.notNull().defaultTo('pending'))
    .addColumn('note', 'varchar(320)')
    .addColumn('decided_by', 'uuid')
    .addColumn('decided_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .execute();

  await db.schema
    .createIndex('business_circle_applications_circle_status_idx')
    .ifNotExists()
    .on('business_circle_applications')
    .columns(['business_circle_id', 'status'])
    .execute();

  await db.schema
    .createIndex('business_circle_applications_applicant_idx')
    .ifNotExists()
    .on('business_circle_applications')
    .columns(['applicant_tenant_id', 'status'])
    .execute();

  await db.schema
    .createIndex('business_circles_public_geo_idx')
    .ifNotExists()
    .on('business_circles')
    .columns(['public_visible', 'status', 'latitude', 'longitude'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('business_circle_applications').ifExists().execute();
  await db.schema.alterTable('business_circles').dropColumn('public_visible').execute();
  await db.schema.alterTable('business_circles').dropColumn('industry_tag').execute();
  await db.schema.alterTable('business_circles').dropColumn('address_label').execute();
  await db.schema.alterTable('business_circles').dropColumn('longitude').execute();
  await db.schema.alterTable('business_circles').dropColumn('latitude').execute();
}
