import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;

/**
 * G1-W∞ 美团代理后台深层 — 结算 / 配额 / 审批 (对标美团代理后台 deep ops).
 *
 * 建立在 056 省市区代理树之上，为省/市/区代理商补三类运营数据：
 * - agent_quotas              : 代理商入驻配额（可开通商户席位数；超出拒绝）
 * - agent_settlements         : 代理商周期结算（结算期/应收金额/状态）
 * - agent_onboarding_approvals: 商户入驻开通审批（由平台/上级代理审批归属到代理商）
 *
 * Honest boundary: 本地试点记录；未接美团实时结算/配额/审批数据。
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
      .createTable('agent_quotas')
      .ifNotExists()
      .addColumn('id', 'uuid', (c) => c.primaryKey())
      .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
      .addColumn('agent_id', 'uuid', (c) => c.notNull().references('platform_agents.id'))
      .addColumn('merchant_quota', 'integer', (c) => c.notNull().defaultTo(0))
      .addUniqueConstraint('agent_quotas_tenant_agent_key', ['tenant_id', 'agent_id']),
  ).execute();

  await columns(
    db.schema
      .createTable('agent_settlements')
      .ifNotExists()
      .addColumn('id', 'uuid', (c) => c.primaryKey())
      .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
      .addColumn('agent_id', 'uuid', (c) => c.notNull().references('platform_agents.id'))
      .addColumn('period_code', 'varchar(32)', (c) => c.notNull())
      .addColumn('period_start', 'date', (c) => c.notNull())
      .addColumn('period_end', 'date', (c) => c.notNull())
      .addColumn('settlement_status', 'varchar(32)', (c) => c.notNull().defaultTo('open'))
      .addColumn('amount_cents', 'bigint', (c) => c.notNull().defaultTo(0))
      .addUniqueConstraint('agent_settlements_tenant_agent_period_key', [
        'tenant_id',
        'agent_id',
        'period_code',
      ]),
  ).execute();

  await columns(
    db.schema
      .createTable('agent_onboarding_approvals')
      .ifNotExists()
      .addColumn('id', 'uuid', (c) => c.primaryKey())
      .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
      .addColumn('agent_id', 'uuid', (c) => c.notNull().references('platform_agents.id'))
      .addColumn('merchant_tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
      .addColumn('approval_status', 'varchar(32)', (c) => c.notNull().defaultTo('pending'))
      .addColumn('requested_by', 'uuid')
      .addColumn('approved_by', 'uuid')
      .addColumn('approved_at', 'timestamptz')
      .addUniqueConstraint('agent_onboarding_approvals_agent_merchant_key', [
        'agent_id',
        'merchant_tenant_id',
      ]),
  ).execute();

  await db.schema
    .createIndex('agent_quotas_agent_idx')
    .ifNotExists()
    .on('agent_quotas')
    .columns(['tenant_id', 'agent_id'])
    .execute();
  await db.schema
    .createIndex('agent_settlements_agent_idx')
    .ifNotExists()
    .on('agent_settlements')
    .columns(['tenant_id', 'agent_id', 'settlement_status'])
    .execute();
  await db.schema
    .createIndex('agent_onboarding_approvals_agent_idx')
    .ifNotExists()
    .on('agent_onboarding_approvals')
    .columns(['tenant_id', 'agent_id', 'approval_status'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropIndex('agent_onboarding_approvals_agent_idx').ifExists().execute();
  await db.schema.dropIndex('agent_settlements_agent_idx').ifExists().execute();
  await db.schema.dropIndex('agent_quotas_agent_idx').ifExists().execute();
  await db.schema.dropTable('agent_onboarding_approvals').ifExists().execute();
  await db.schema.dropTable('agent_settlements').ifExists().execute();
  await db.schema.dropTable('agent_quotas').ifExists().execute();
}
