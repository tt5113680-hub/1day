import { sql, type Kysely } from 'kysely';
import type { Database } from '../types.js';

const now = sql`now()`;

/**
 * W∞-110 — 会员闭环加固：等级/权益规则 + 到期提醒 + 异常告警（MPC-08 / Phase1 1.5）。
 *
 * 诚实边界：本切片仅提供等级与权益的「规则配置」、会员/权益到期与异常的信号挖掘，
 * **不含储值、不含支付、不代第三方成交**。金额口径一律不出现。
 *
 * - `membership_enrollments` 增加 `expires_at`（会员有效期截止，供到期提醒）与
 *   `last_active_at`（最近一次权益核销/发放时间，供活跃度与异常判定）。
 * - `membership_benefit_rules` 为租户范围「等级→权益规则」配置（title/tier/benefits_config/
 *   validity_days/enforce_quantity/enabled），是规则单一真源，非资金账。
 */
export async function up(db: Kysely<Database>) {
  await db.schema
    .alterTable('membership_enrollments')
    .addColumn('expires_at', 'timestamptz')
    .execute();
  await db.schema
    .alterTable('membership_enrollments')
    .addColumn('last_active_at', 'timestamptz')
    .execute();
  await db.schema
    .createTable('membership_benefit_rules')
    .ifNotExists()
    .addColumn('id', 'uuid', (c) => c.primaryKey())
    .addColumn('tenant_id', 'uuid', (c) => c.notNull().references('tenants.id'))
    .addColumn('title', 'varchar(80)', (c) => c.notNull())
    .addColumn('tier', 'varchar(48)', (c) => c.notNull())
    .addColumn('benefits_config', 'jsonb', (c) => c.notNull())
    .addColumn('validity_days', 'integer', (c) => c.notNull().defaultTo(365))
    .addColumn('enforce_quantity', 'boolean', (c) => c.notNull().defaultTo(false))
    .addColumn('enabled', 'boolean', (c) => c.notNull().defaultTo(true))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('created_by', 'uuid')
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updated_by', 'uuid')
    .addColumn('deleted_at', 'timestamptz')
    .addColumn('version', 'integer', (c) => c.notNull().defaultTo(1))
    .addUniqueConstraint('membership_benefit_rules_tier_unique', ['tenant_id', 'tier'])
    .execute();
  await db.schema
    .createIndex('membership_benefit_rules_tenant_enabled_idx')
    .ifNotExists()
    .on('membership_benefit_rules')
    .columns(['tenant_id', 'enabled'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropTable('membership_benefit_rules').ifExists().execute();
  await db.schema.alterTable('membership_enrollments').dropColumn('expires_at').execute();
  await db.schema.alterTable('membership_enrollments').dropColumn('last_active_at').execute();
}
