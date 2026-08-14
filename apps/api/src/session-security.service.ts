import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';

/**
 * G1-W∞-119 — suspend 会话即时失效（§6 W∞-SAAS-LIFE）管理面只读观测。
 *
 * 真实档案行现场推导（禁止假 BI）：
 *  - `authEpoch`            <- `tenants.auth_epoch`（suspend/reactivate 都会 +1）
 *  - `suspended`            <- `tenants.status='suspended'`
 *  - `activeSessions`       <- `auth_sessions` 中 status='active' 且未 revoke 的会话数
 *  - `sessionsByEpoch`      <- 按 `auth_sessions.auth_epoch` 分组统计（展示存量会话代数）
 *  - `recentRevocations`    <- 最近被平台 suspend 之会话批量 revoke 的条数（已 revoke 会话）
 *
 * 只读、仅登记租户内会话安全状态；不碰钱/销售、不含支付、非本平台下单、不接美团/抖音实时。
 */
@Injectable()
export class SessionSecurityService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  async report(context: OrganizationContext) {
    const tenant = (
      await this.pool.query(
        'select status,auth_epoch from tenants where id=$1 and deleted_at is null',
        [context.tenantId],
      )
    ).rows[0];
    const status = tenant?.status ?? 'suspended';
    const authEpoch = tenant ? Number(tenant.auth_epoch) : 0;
    const active = Number(
      (
        await this.pool.query(
          "select count(*)::int c from auth_sessions where tenant_id=$1 and status='active' and revoked_at is null and deleted_at is null",
          [context.tenantId],
        )
      ).rows[0].c,
    );
    const sessionsByEpoch = (
      await this.pool.query(
        `select auth_epoch, count(*)::int c
         from auth_sessions
         where tenant_id=$1 and deleted_at is null
         group by auth_epoch
         order by auth_epoch desc`,
        [context.tenantId],
      )
    ).rows.map((row) => ({ authEpoch: Number(row.auth_epoch), count: Number(row.c) }));
    const recentRevocations = Number(
      (
        await this.pool.query(
          `select count(*)::int c
           from auth_sessions
           where tenant_id=$1 and status='revoked' and revoked_at is not null
             and revoked_at > now()-interval '1 day' and deleted_at is null`,
          [context.tenantId],
        )
      ).rows[0].c,
    );
    return {
      status,
      suspended: status === 'suspended',
      authEpoch,
      activeSessions: active,
      sessionsByEpoch,
      recentRevocations,
    };
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
