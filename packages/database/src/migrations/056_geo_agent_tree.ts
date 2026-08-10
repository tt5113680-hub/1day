import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;
const SYSTEM_TENANT_ID = '00000000-0000-4000-8000-000000000001';

/**
 * G1-W6 (R5): 省市区代理地理层级树 — 对标美团平台/代理 PC.
 *
 * MP-01 agent_regions + platform_agents: province/city/district geographic agent tree,
 *   each agent bound to one region with a parent-agent (省→市→区) hierarchy.
 * MP-02 agent_merchant_affiliations: merchant 入驻开通归属到具体省/市/区代理商
 *   (geo-scoped affiliation). Honest local records only; no live Meituan agent sync.
 * MP-03 the Channel dashboard (existing /ch/dashboard) reads the same tables.
 */
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
      .createTable('agent_regions')
      .ifNotExists()
      .addColumn('id', 'uuid', (c) => c.primaryKey())
      .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
      .addColumn('code', 'varchar(80)', (c) => c.notNull())
      .addColumn('name', 'varchar(160)', (c) => c.notNull())
      .addColumn('level', 'varchar(16)', (c) => c.notNull())
      .addColumn('parent_region_id', 'uuid', (c) => c.references('agent_regions.id'))
      .addUniqueConstraint('agent_regions_tenant_code_key', ['tenant_id', 'code']),
  ).execute();

  await columns(
    db.schema
      .createTable('platform_agents')
      .ifNotExists()
      .addColumn('id', 'uuid', (c) => c.primaryKey())
      .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
      .addColumn('region_id', 'uuid', (c) => c.notNull().references('agent_regions.id'))
      .addColumn('agent_level', 'varchar(16)', (c) => c.notNull())
      .addColumn('code', 'varchar(80)', (c) => c.notNull())
      .addColumn('name', 'varchar(160)', (c) => c.notNull())
      .addColumn('parent_agent_id', 'uuid', (c) => c.references('platform_agents.id'))
      .addUniqueConstraint('platform_agents_tenant_region_key', ['tenant_id', 'region_id']),
  ).execute();

  await columns(
    db.schema
      .createTable('agent_merchant_affiliations')
      .ifNotExists()
      .addColumn('id', 'uuid', (c) => c.primaryKey())
      .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
      .addColumn('agent_id', 'uuid', (c) => c.notNull().references('platform_agents.id'))
      .addColumn('merchant_tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
      .addColumn('affiliation_status', 'varchar(32)', (c) => c.notNull().defaultTo('invited'))
      .addUniqueConstraint('agent_merchant_affiliations_agent_merchant_key', [
        'agent_id',
        'merchant_tenant_id',
      ]),
  ).execute();

  await db.schema
    .createIndex('agent_regions_tree_idx')
    .ifNotExists()
    .on('agent_regions')
    .columns(['tenant_id', 'level', 'parent_region_id'])
    .execute();
  await db.schema
    .createIndex('platform_agents_level_idx')
    .ifNotExists()
    .on('platform_agents')
    .columns(['tenant_id', 'agent_level', 'parent_agent_id'])
    .execute();
  await db.schema
    .createIndex('agent_merchant_affiliations_pool_idx')
    .ifNotExists()
    .on('agent_merchant_affiliations')
    .columns(['tenant_id', 'agent_id', 'affiliation_status'])
    .execute();

  // Honest demonstration geography (TEST ONLY) so the 省市区代理树 renders in
  // the local HUMAN PILOT sandbox. Deterministic seed; no live Meituan geo data.
  const gd = '10000000-0000-4000-8000-000000000001';
  const gz = '10000000-0000-4000-8000-000000000002';
  const th = '10000000-0000-4000-8000-000000000003';
  const sd = '10000000-0000-4000-8000-000000000004';
  const bj = '10000000-0000-4000-8000-000000000005';
  await db
    .insertInto('agent_regions')
    .values([
      {
        id: gd,
        tenant_id: SYSTEM_TENANT_ID,
        code: 'GD',
        name: '广东省',
        level: 'province',
        parent_region_id: null,
        status: 'active',
      },
      {
        id: sd,
        tenant_id: SYSTEM_TENANT_ID,
        code: 'SD',
        name: '山东省',
        level: 'province',
        parent_region_id: null,
        status: 'active',
      },
      {
        id: bj,
        tenant_id: SYSTEM_TENANT_ID,
        code: 'BJ',
        name: '北京市',
        level: 'province',
        parent_region_id: null,
        status: 'active',
      },
      {
        id: gz,
        tenant_id: SYSTEM_TENANT_ID,
        code: 'GZ-CITY',
        name: '广州市',
        level: 'city',
        parent_region_id: gd,
        status: 'active',
      },
      { id: th, tenant_id: SYSTEM_TENANT_ID, code: 'TH', name: '天河区', level: 'district', parent_region_id: gz, status: 'active' },
    ])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropIndex('agent_merchant_affiliations_pool_idx').ifExists().execute();
  await db.schema.dropIndex('platform_agents_level_idx').ifExists().execute();
  await db.schema.dropIndex('agent_regions_tree_idx').ifExists().execute();
  await db.schema.dropTable('agent_merchant_affiliations').ifExists().execute();
  await db.schema.dropTable('platform_agents').ifExists().execute();
  await db.schema.dropTable('agent_regions').ifExists().execute();
}
