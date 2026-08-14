import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;

/**
 * W∞-122 — 代理结算周期 + 合同状态机（无资金托管）（Phase3 §6 W∞-SAAS，toward PARITY）。
 *
 * 建立在 057 省市区代理深层运营（agent_quotas / agent_settlements / agent_onboarding_approvals）之上，
 * 为 /p/agents 补齐「BD/合同（代理）→ 合同状态机」与「结算周期」两块可作业闭环数据：
 *
 * - agent_contracts : 代理商合同状态机（tenant_scoped）
 *   contract_status 生命周期：draft → pending → active → (paused ⭢ active) → expired | terminated。
 *   合同仅登记合作意向/状态与起止，**不含资金、不含费率、不含佣金**（无资金托管）。
 *   含 approved_by/approved_at（激活裁决人/时间）、paused_at/resumed_at、expired_at/terminated_at、
 *   reason（暂停/终止原因）等生命周期字段，使状态迁移可追溯。
 *   (tenant_id, contract_code) 唯一 + agent 维度索引。
 * - agent_settlements 新增 cycle_number（结算周期序号，同一代理商按开启顺序递增），
 *   使「周期」更显式可观测（cycle 号 + period_code 双键）。
 *
 * 诚实边界：合同/结算均为推广员工具侧本地合作与代理运营档案；不碰钱、不碰销售、不碰管理、
 * 无资金托管、不含费率/佣金/分账、未接美团实时代理/结算数据。§5 READY 未触碰。
 */
const baseColumns = (table: ReturnType<Kysely<Database>['schema']['createTable']>) =>
  table
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1));

export async function up(db: Kysely<Database>) {
  await baseColumns(
    db.schema
      .createTable('agent_contracts')
      .ifNotExists()
      .addColumn('id', 'uuid', (c) => c.primaryKey())
      .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
      .addColumn('agent_id', 'uuid', (c) => c.notNull().references('platform_agents.id'))
      .addColumn('contract_code', 'varchar(80)', (c) => c.notNull())
      .addColumn('contract_title', 'varchar(160)', (c) => c.notNull())
      .addColumn('contract_status', 'varchar(32)', (c) => c.notNull().defaultTo('draft'))
      .addColumn('sign_date', 'date')
      .addColumn('start_date', 'date')
      .addColumn('end_date', 'date')
      .addColumn('reason', 'varchar(320)')
      .addColumn('approved_by', 'uuid')
      .addColumn('approved_at', 'timestamptz')
      .addColumn('paused_at', 'timestamptz')
      .addColumn('resumed_at', 'timestamptz')
      .addColumn('expired_at', 'timestamptz')
      .addColumn('terminated_at', 'timestamptz')
      .addUniqueConstraint('agent_contracts_tenant_code_key', ['tenant_id', 'contract_code']),
  ).execute();

  await db.schema
    .createIndex('agent_contracts_agent_idx')
    .ifNotExists()
    .on('agent_contracts')
    .columns(['tenant_id', 'agent_id', 'contract_status'])
    .execute();

  await db.schema
    .alterTable('agent_settlements')
    .addColumn('cycle_number', 'integer', (column) => column.defaultTo(0))
    .execute();
  await db.schema
    .createIndex('agent_settlements_cycle_idx')
    .ifNotExists()
    .on('agent_settlements')
    .columns(['tenant_id', 'agent_id', 'cycle_number'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropIndex('agent_settlements_cycle_idx').ifExists().execute();
  await db.schema.alterTable('agent_settlements').dropColumn('cycle_number').execute();
  await db.schema.dropIndex('agent_contracts_agent_idx').ifExists().execute();
  await db.schema.dropTable('agent_contracts').ifExists().execute();
}
