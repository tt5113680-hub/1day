import type { Kysely } from 'kysely';
import type { Database } from '../types.js';

/**
 * G1-W∞-119 — suspend 会话即时失效（Phase3 SaaS 最强，§6 W∞-SAAS-LIFE）。
 *
 * SaaS 最强目标：租户一旦被 suspend，其**所有已签发访问令牌**必须立即失效（fail-closed），
 * 不得等到下一次重新认证。系统已有两层保障：
 *   1. 每次请求在 `claims()` 里 join `tenants.status='active'`；
 *   2. suspend 事务内把该租户全部 `active` 会话置为 `revoked`。
 *
 * 本次再加第三层「会话代数（auth_epoch）快照」作为唯一真源加固：
 * 每个 `auth_sessions` 行记录签发它那一刻 `tenants.auth_epoch`。请求校验时额外强制
 * `s.auth_epoch = t.auth_epoch`——即任何「在旧代数签发」的令牌，无论是否被 revoke
 * UPDATE 命中，都会因代数不一致被硬拒。suspend 会 bump `tenants.auth_epoch`，
 * 从而令该租户**瞬间**废弃全部存量会话令牌；reactivate 后新会话快照新代数，
 * 旧令牌依旧永久失效（不可复活）。
 *
 * 诚实边界：会话加固只控制「租户内工具访问授权是否即时关断/放开」，不碰钱、不碰销售、
 * 不碰店务数据、无 GMV、不含支付金额、非本平台下单、不接美团/抖音实时。
 */
export async function up(db: Kysely<Database>) {
  await db.schema
    .alterTable('auth_sessions')
    .addColumn('auth_epoch', 'integer', (column) => column.notNull().defaultTo(0))
    .execute();
  await db.schema
    .alterTable('auth_sessions')
    .alterColumn('auth_epoch', (column) => column.setNotNull())
    .execute();
  await db.schema
    .createIndex('auth_sessions_tenant_auth_epoch_idx')
    .ifNotExists()
    .on('auth_sessions')
    .columns(['tenant_id', 'auth_epoch'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropIndex('auth_sessions_tenant_auth_epoch_idx').ifExists().execute();
  await db.schema.alterTable('auth_sessions').dropColumn('auth_epoch').execute();
}
