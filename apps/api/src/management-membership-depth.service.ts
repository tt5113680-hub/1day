import { BadRequestException, Injectable, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { type Pool, type PoolClient } from 'pg';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';

const uuid = /^[0-9a-f-]{36}$/i;
const text = (value: unknown, max: number, required = true) => {
  const result =
    value === undefined || value === null
      ? ''
      : typeof value === 'string'
        ? value.trim()
        : String(value).trim();
  if (required && !result) throw new BadRequestException('VALIDATION_ERROR');
  if (result.length > max) throw new BadRequestException('VALIDATION_ERROR');
  return result;
};

const intRange = (value: unknown, min: number, max: number, dflt: number) => {
  if (value === undefined || value === null) return dflt;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw new BadRequestException('VALIDATION_ERROR');
  return n;
};

interface BenefitConfig {
  benefitId: string;
  benefitTitle: string;
  maxQuantity?: number;
  validityDays?: number;
}

/**
 * W∞-110 — 会员闭环加固：等级/权益规则 + 到期提醒 + 异常告警（MPC-08 / Phase1 1.5）。
 *
 * 诚实边界：等级权益为「规则配置」，到期提醒与异常告警为真实会员/权益档案信号挖掘；
 * **不碰储值、不碰支付、不代第三方成交、不含成交金额**。
 *
 * - `rules` / `upsertRule`：管理 `membership_benefit_rules` 等级→权益规则（单一真源，可审计）。
 * - `renewals`：到期提醒 —— 会员有效期临近/已过、或长期无核销活跃的会员真实档案。
 * - `alerts`：异常告警 —— 已暂停/已取消、有效期已过仍在册、有发放但余额低/异常等真实档案。
 * - W∞-135 `cohort`：入会月 cohort（在册/仍有效/已过期/近 30 天活跃）只读聚合。
 */
@Injectable()
export class ManagementMembershipDepthService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  async rules(context: OrganizationContext) {
    const rows = await this.pool.query(
      `select r.id,r.title,r.tier,r.benefits_config::jsonb as benefits_config,
              r.validity_days,r.enforce_quantity,r.enabled,r.updated_at
       from membership_benefit_rules r
       where r.tenant_id=$1 and r.deleted_at is null
       order by r.tier`,
      [context.tenantId],
    );
    return rows.rows;
  }

  async upsertRule(
    context: OrganizationContext,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    if (!key.trim() || key.length > 160) throw new BadRequestException('VALIDATION_ERROR');
    const title = text(body.title, 80);
    const tier = text(body.tier, 48);
    if (!title || !tier) throw new BadRequestException('VALIDATION_ERROR');
    if (!Array.isArray(body.benefitsConfig) || body.benefitsConfig.length < 1)
      throw new BadRequestException('VALIDATION_ERROR');
    if (body.benefitsConfig.length > 50) throw new BadRequestException('VALIDATION_ERROR');
    const benefitsConfig: BenefitConfig[] = body.benefitsConfig.map((raw) => {
      const entry = raw as Record<string, unknown>;
      const benefitId = text(entry.benefitId, 36);
      if (!benefitId || !uuid.test(benefitId)) throw new BadRequestException('VALIDATION_ERROR');
      const benefitTitle = text(entry.benefitTitle, 80);
      return {
        benefitId,
        benefitTitle,
        maxQuantity: intRange(entry.maxQuantity, 1, 1000000, 1),
        validityDays: intRange(entry.validityDays, 1, 3650, 0),
      };
    });
    const validityDays = intRange(body.validityDays, 1, 3650, 365);
    const enforceQuantity =
      body.enforceQuantity === true || body.enforceQuantity === false
        ? Boolean(body.enforceQuantity)
        : false;
    const enabled = body.enabled === true || body.enabled === false ? Boolean(body.enabled) : true;
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const replay = await client.query(
        "select response from idempotency_keys where tenant_id=$1 and resource_type='membership_benefit_rule' and idempotency_key=$2 and deleted_at is null",
        [context.tenantId, key],
      );
      if (replay.rowCount) {
        await client.query('commit');
        return replay.rows[0].response;
      }
      const row = await client.query(
        `insert into membership_benefit_rules(id,tenant_id,title,tier,benefits_config,validity_days,enforce_quantity,enabled,created_by,updated_by)
         values($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)
         on conflict (tenant_id,tier)
         do update set title=excluded.title,benefits_config=excluded.benefits_config,
           validity_days=excluded.validity_days,enforce_quantity=excluded.enforce_quantity,
           enabled=excluded.enabled,updated_at=now(),updated_by=excluded.updated_by,
           deleted_at=null,version=membership_benefit_rules.version+1
         returning id,tier,version`,
        [
          randomUUID(),
          context.tenantId,
          title,
          tier,
          JSON.stringify(benefitsConfig),
          validityDays,
          enforceQuantity,
          enabled,
          context.userId,
        ],
      );
      const rule = row.rows[0];
      const details = {
        title,
        tier,
        benefits: benefitsConfig.length,
        validityDays,
        enforceQuantity,
        enabled,
      };
      await this.record(
        client,
        context,
        'membership.rule_upserted',
        context.tenantId,
        requestId,
        details,
      );
      await client.query(
        `insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by)
         values($1,$2,$3,'membership_benefit_rules',$4,$5,$6,'page-m-003',$7,$7)`,
        [
          randomUUID(),
          context.tenantId,
          'membership.benefit_rule.upserted.v1',
          context.tenantId,
          { id: rule.id, tier, validityDays, enabled },
          uuid.test(requestId) ? requestId : randomUUID(),
          context.userId,
        ],
      );
      await client.query(
        "insert into idempotency_keys(id,tenant_id,resource_type,idempotency_key,response,created_by,updated_by) values($1,$2,'membership_benefit_rule',$3,$4,$5,$5)",
        [
          randomUUID(),
          context.tenantId,
          key,
          { id: rule.id, tier, version: rule.version },
          context.userId,
        ],
      );
      await client.query('commit');
      return { id: rule.id, tier, version: rule.version };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  /** 到期提醒：会员有效期临近 3 天内、已过期仍在册、或超过 validity_days 无活跃信号。 */
  async renewals(context: OrganizationContext, storeIds: string[] | null = null) {
    const scoped = storeIds !== null;
    const params = scoped ? [context.tenantId, storeIds] : [context.tenantId];
    const storeFilter = scoped ? ' and e.store_id = any($2::uuid[])' : '';
    const rows = await this.pool.query(
      `select e.id,e.member_code,e.tier,e.enrollment_status,e.joined_at,e.expires_at,e.last_active_at,
              c.display_name,s.name as store_name
       from membership_enrollments e
       join customers c on c.id=e.customer_id and c.tenant_id=e.tenant_id
       left join stores s on s.id=e.store_id and s.tenant_id=e.tenant_id
       where e.tenant_id=$1 and e.deleted_at is null and e.enrollment_status='active' ${storeFilter}
         and (
           (e.expires_at is not null and e.expires_at <= now()+interval '3 days')
           or (e.last_active_at is not null and e.last_active_at <= now()-interval '90 days')
           or (e.last_active_at is null and e.joined_at is not null and e.joined_at <= now()-interval '120 days')
         )
       order by coalesce(e.expires_at, e.joined_at) asc
       limit 100`,
      params,
    );
    return rows.rows;
  }

  /** 异常告警：已暂停/取消但仍在册、有效期已过、长期未核销活跃。 */
  async alerts(context: OrganizationContext, storeIds: string[] | null = null) {
    const scoped = storeIds !== null;
    const params = scoped ? [context.tenantId, storeIds] : [context.tenantId];
    const storeFilter = scoped ? ' and e.store_id = any($2::uuid[])' : '';
    const suspended = await this.pool.query(
      `select e.id,e.member_code,e.tier,e.enrollment_status,e.suspended_at as occurred_at,
              c.display_name,s.name as store_name,'suspended'::text as alert_type
       from membership_enrollments e
       join customers c on c.id=e.customer_id and c.tenant_id=e.tenant_id
       left join stores s on s.id=e.store_id and s.tenant_id=e.tenant_id
       where e.tenant_id=$1 and e.deleted_at is null
         and e.enrollment_status in ('suspended','cancelled') ${storeFilter}
       order by e.updated_at desc
       limit 100`,
      params,
    );
    const expired = await this.pool.query(
      `select e.id,e.member_code,e.tier,e.enrollment_status,e.expires_at as occurred_at,
              c.display_name,s.name as store_name,'expired'::text as alert_type
       from membership_enrollments e
       join customers c on c.id=e.customer_id and c.tenant_id=e.tenant_id
       left join stores s on s.id=e.store_id and s.tenant_id=e.tenant_id
       where e.tenant_id=$1 and e.deleted_at is null and e.enrollment_status='active'
         and e.expires_at is not null and e.expires_at < now() ${storeFilter}
       order by e.expires_at asc
       limit 100`,
      params,
    );
    const inactive = await this.pool.query(
      `select e.id,e.member_code,e.tier,e.enrollment_status,null::timestamptz as occurred_at,
              c.display_name,s.name as store_name,'no_recent_activity'::text as alert_type
       from membership_enrollments e
       join customers c on c.id=e.customer_id and c.tenant_id=e.tenant_id
       left join stores s on s.id=e.store_id and s.tenant_id=e.tenant_id
       where e.tenant_id=$1 and e.deleted_at is null and e.enrollment_status='active'
         and e.last_active_at is not null and e.last_active_at <= now()-interval '180 days' ${storeFilter}
       order by e.last_active_at asc
       limit 100`,
      params,
    );
    return {
      suspended: suspended.rows,
      expired: expired.rows,
      noRecentActivity: inactive.rows,
    };
  }

  /**
   * W∞-135 — §2 会员 densify：入会月 cohort。
   * 真实 `membership_enrollments` 聚合；不含储值/支付/GMV。
   */
  async cohort(context: OrganizationContext, months = 6, storeIds: string[] | null = null) {
    if (![3, 6, 12, 24].includes(months)) throw new BadRequestException('VALIDATION_ERROR');
    const scoped = storeIds !== null && storeIds.length > 0;
    const params: (string | number | string[])[] = scoped
      ? [context.tenantId, months, storeIds]
      : [context.tenantId, months];
    const storeFilter = scoped ? ' and e.store_id = any($3::uuid[])' : '';
    const rows = await this.pool.query(
      `select to_char(date_trunc('month', e.joined_at), 'YYYY-MM') as cohort_month,
              count(*)::int as enrolled,
              count(*) filter (
                where e.enrollment_status='active'
                  and (e.expires_at is null or e.expires_at > now())
              )::int as still_valid,
              count(*) filter (
                where e.expires_at is not null and e.expires_at < now()
              )::int as expired,
              count(*) filter (
                where e.last_active_at is not null
                  and e.last_active_at >= now() - interval '30 days'
              )::int as active_30d
       from membership_enrollments e
       where e.tenant_id=$1 and e.deleted_at is null
         and e.joined_at is not null
         and e.joined_at >= date_trunc('month', now()) - ($2::text || ' months')::interval
         ${storeFilter}
       group by 1
       order by 1 asc`,
      params,
    );
    return {
      months,
      cohorts: rows.rows.map((row) => ({
        cohortMonth: String(row.cohort_month),
        enrolled: Number(row.enrolled),
        stillValid: Number(row.still_valid),
        expired: Number(row.expired),
        active30d: Number(row.active_30d),
      })),
      disclaimer:
        'cohort 由本地 membership_enrollments 入会月聚合；不含储值/支付/GMV，不代表第三方成交。',
    };
  }

  private async record(
    client: Pool | PoolClient,
    context: OrganizationContext,
    action: string,
    resourceId: string,
    requestId: string,
    details: unknown,
  ) {
    await client.query(
      "insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,$4,'membership_benefit_rule',$5,$6,'page-m-003',$7,$3,$3)",
      [
        randomUUID(),
        context.tenantId,
        context.userId,
        action,
        resourceId,
        uuid.test(requestId) ? requestId : randomUUID(),
        details,
      ],
    );
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
