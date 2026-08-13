import type { Kysely } from 'kysely';
import type { Database } from '../types.js';

/**
 * G1-W∞-116 — 员工邀请→激活→角色包（MPC-10 / Phase2）。
 *
 * 诚实边界：角色包与门店 scope 仅是推广员工具在租户内的**访问授权登记**，
 * **不接美团/抖音实时人事或绩效、不代第三方回写、不碰销售/管店、非本平台下单**。
 *
 * `membership_invitations` 新增 role_id（目标角色包）与 store_id（可选门店 scope）：
 * 邀请发出时登记目标角色包，员工接受激活时据此绑定 `membership_roles` 与门店 scope，
 * 形成 邀请→激活→角色包→门店 scope 的可作业闭环（单真源在 invitation 档案行）。
 */
export async function up(db: Kysely<Database>) {
  await db.schema.alterTable('membership_invitations').addColumn('role_id', 'uuid').execute();
  await db.schema.alterTable('membership_invitations').addColumn('store_id', 'uuid').execute();
  await db.schema
    .createIndex('membership_invitations_role_idx')
    .ifNotExists()
    .on('membership_invitations')
    .columns(['tenant_id', 'role_id', 'status'])
    .execute();
}

export async function down(db: Kysely<Database>) {
  await db.schema.dropIndex('membership_invitations_role_idx').ifExists().execute();
  await db.schema.alterTable('membership_invitations').dropColumn('store_id').execute();
  await db.schema.alterTable('membership_invitations').dropColumn('role_id').execute();
}
