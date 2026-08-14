import { BadRequestException, Injectable, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';

/**
 * 配额维度标签（对外中文）。
 */
const DIMENSION_LABELS: Record<string, string> = {
  users: '开放账号',
  customers: '客户档案',
  stores: '门店入口',
};

/**
 * 套餐级配额默认值（单真源）— 与 `/p/tenants` 校验契约 {users,customers,stores} 对齐。
 * 若 tenant 设置了 `platform_tenant_settings.quotas` 中对应键则用设置值，否则回落套餐默认。
 */
const PLAN_LIMITS: Record<string, { users: number; customers: number; stores: number }> =
  Object.freeze({
    starter: { users: 10, customers: 1000, stores: 3 },
    growth: { users: 50, customers: 10000, stores: 20 },
    enterprise: { users: 2000, customers: 100000, stores: 100 },
  });

export interface QuotaUsageRow {
  dimension: string;
  label: string;
  limit: number;
  usage: number;
  remaining: number;
  reached: boolean;
}

@Injectable()
export class TenantQuotaService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  /** 读取租户套餐与配额上限（原始数字），回落套餐默认。 */
  async plan(
    client: Pool | PoolClient,
    tenantId: string,
  ): Promise<{ plan: string; planLabel: string }> {
    const row = (
      await client.query(
        `select coalesce(s.plan,'starter') plan
         from tenants t
         left join platform_tenant_settings s on s.tenant_id=t.id and s.deleted_at is null
         where t.id=$1 and t.deleted_at is null`,
        [tenantId],
      )
    ).rows[0];
    const plan = row?.plan ?? 'starter';
    return { plan, planLabel: this.planLabel(plan) };
  }

  private planLabel(plan: string): string {
    if (plan === 'growth') return '成长版';
    if (plan === 'enterprise') return '企业版';
    return '起步版';
  }

  private normalizeQuotas(
    raw: unknown,
    plan: string,
  ): { users: number; customers: number; stores: number } {
    const defaults: { users: number; customers: number; stores: number } = PLAN_LIMITS[plan] ?? {
      users: 10,
      customers: 1000,
      stores: 3,
    };
    const x = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    const num = (k: string, d: number): number => {
      const v = x[k];
      const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
      return Number.isInteger(n) && n >= 1 ? n : d;
    };
    return {
      users: num('users', defaults.users),
      customers: num('customers', defaults.customers),
      stores: num('stores', defaults.stores),
    };
  }

  /** 真实已用量（当前活跃档案行数）。 */
  async usage(client: Pool | PoolClient, tenantId: string, dimension: string): Promise<number> {
    const map: Record<string, string> = {
      users: `select (
        (select count(*) from memberships where tenant_id=$1 and status='active' and deleted_at is null)
        + (select count(*) from membership_invitations where tenant_id=$1 and status='pending' and deleted_at is null and (expires_at is null or expires_at>now()))
      )::int c`,
      customers: `select count(*)::int c from customers where tenant_id=$1 and status='active' and deleted_at is null`,
      stores: `select count(*)::int c from stores where tenant_id=$1 and status='active' and deleted_at is null`,
    };
    const sql = map[dimension];
    if (!sql) throw new BadRequestException('VALIDATION_ERROR');
    const r = await client.query(sql, [tenantId]);
    return Number(r.rows[0]?.c ?? 0);
  }

  /** 触发拦截：写入被拒台账 + 返回是否被拒。 */
  async assertWithin(
    client: PoolClient,
    context: OrganizationContext,
    dimension: string,
    sourceResource: string,
    sourceId: string | null = null,
  ): Promise<void> {
    if (!['users', 'customers', 'stores'].includes(dimension))
      throw new BadRequestException('VALIDATION_ERROR');
    const { plan } = await this.plan(client, context.tenantId);
    const setting = (
      await client.query(
        `select quotas from platform_tenant_settings
         where tenant_id=$1 and deleted_at is null for update`,
        [context.tenantId],
      )
    ).rows[0];
    const quotas = this.normalizeQuotas(setting?.quotas, plan);
    const limit = quotas[dimension as keyof typeof quotas] as number;
    const used = await this.usage(client, context.tenantId, dimension);
    if (used < limit) return;
    // Ledger is best-effort on a separate connection: quota hard-block must stay HTTP 400
    // even if the rejection row/audit/outbox insert fails (never leak 500 on this path).
    try {
      await this.recordRejection(context, plan, dimension, sourceResource, sourceId, used, limit);
    } catch {
      /* rejection ledger must not convert a quota deny into 500 */
    }
    throw new BadRequestException(
      `QUOTA_LIMIT_REACHED ${JSON.stringify({
        code: 'QUOTA_LIMIT_REACHED',
        dimension,
        label: DIMENSION_LABELS[dimension],
        usage: used,
        limit,
        plan,
        planLabel: this.planLabel(plan),
        upgradeCopy: this.upgradeCopy(dimension, plan, limit),
      })}`,
    );
  }

  /**
   * 持久化一次配额被拒的台账 + 审计 + 投放事件。
   *
   * 说明：`assertWithin` 是在调用方的写事务（`client`）内被调用的，而配额触顶必须
   * **拒绝**该笔新建写。若在同一个事务 `client` 上写台账再抛错，调用方的 catch 会
   * rollback，导致「被拒记录」随被拒的写入一起丢失，租户便无从核查「为什么这一笔被拒」
   * 与升级引导。因此这里用独立的 auto-commit 连接落库，使被拒台账在拒绝写入后依然持久，
   * 供 `/m/settings` 套餐配额面板与运营核查使用，且不违反「配额触顶拒绝新建写」的语义。
   */
  private async recordRejection(
    context: OrganizationContext,
    plan: string,
    dimension: string,
    sourceResource: string,
    sourceId: string | null,
    used: number,
    limit: number,
  ): Promise<void> {
    // pool.query auto-commits on a short-lived client so the outer write txn can
    // still roll back the over-quota create without erasing the rejection ledger.
    const referenceId = sourceId ?? randomUUID();
    const details = JSON.stringify({
      dimension,
      sourceResource,
      usage: used,
      limit,
      plan,
      planLabel: this.planLabel(plan),
      upgradeCopy: this.upgradeCopy(dimension, plan, limit),
    });
    const payload = JSON.stringify({
      dimension,
      sourceResource,
      usage: used,
      limit,
      plan,
      planLabel: this.planLabel(plan),
    });
    await this.pool.query(
      `insert into tenant_quota_rejections(id,tenant_id,dimension,source_resource,source_id,current_usage,current_limit,actor_id,created_by)
       values($1,$2,$3,$4,$5,$6,$7,$8,$8)`,
      [
        randomUUID(),
        context.tenantId,
        dimension,
        sourceResource,
        sourceId,
        used,
        limit,
        context.userId,
      ],
    );
    await this.pool.query(
      `insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by)
       values($1,$2,$3,'management.quota_rejected','tenant_quota',$4,$5,'page-m-118',$6::jsonb,$3,$3)`,
      [randomUUID(), context.tenantId, context.userId, referenceId, randomUUID(), details],
    );
    await this.pool.query(
      `insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by)
       values($1,$2,'tenant.quota_rejected.v1','tenant_quota',$3,$4::jsonb,$5,'page-m-118',$6,$6)`,
      [randomUUID(), context.tenantId, referenceId, payload, randomUUID(), context.userId],
    );
  }

  /** 升级引导文案（只做能力边界陈述，不怂恿承诺、不碰销售）。 */
  private upgradeCopy(dimension: string, plan: string, limit: number): string {
    const d = DIMENSION_LABELS[dimension] ?? dimension;
    const to = plan === 'starter' ? '成长版' : plan === 'growth' ? '企业版' : null;
    return to
      ? `当前${d}额度 ${limit} 已用满。请升级到 ${to} 扩充配额，或先处理既有档案后再新增。`
      : `当前${d}额度 ${limit} 已用满。请先处理既有档案后再新增。`;
  }

  /** 配额总览（/m 配额面板数据，真实档案行现场推导，禁止假 BI）。 */
  async status(context: OrganizationContext): Promise<{
    plan: string;
    planLabel: string;
    upgrades: QuotaUsageRow[];
    rejectedRecent: unknown[];
  }> {
    const { plan, planLabel } = await this.plan(this.pool, context.tenantId);
    const setting = (
      await this.pool.query(
        `select quotas from platform_tenant_settings
         where tenant_id=$1 and deleted_at is null`,
        [context.tenantId],
      )
    ).rows[0];
    const quotas = this.normalizeQuotas(setting?.quotas, plan);
    const dims = ['users', 'customers', 'stores'] as const;
    const upgrades: QuotaUsageRow[] = [];
    for (const dimension of dims) {
      const limit = quotas[dimension] as number;
      const usage = await this.usage(this.pool, context.tenantId, dimension);
      upgrades.push({
        dimension,
        label: DIMENSION_LABELS[dimension] ?? dimension,
        limit,
        usage,
        remaining: Math.max(0, limit - usage),
        reached: usage >= limit,
      });
    }
    const rejected = (
      await this.pool.query(
        `select dimension,source_resource,current_usage,current_limit,rejected_at
         from tenant_quota_rejections
         where tenant_id=$1 and deleted_at is null
         order by rejected_at desc limit 20`,
        [context.tenantId],
      )
    ).rows;
    return { plan, planLabel, upgrades, rejectedRecent: rejected };
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
