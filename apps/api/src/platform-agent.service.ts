import {
  BadRequestException,
  ConflictException,
  Injectable,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';

const LEVELS = new Set(['province', 'city', 'district']);
const AGENT_STATUS = new Set(['active', 'paused']);
const AFFILIATION_STATUS = new Set(['invited', 'active', 'paused']);
const SETTLEMENT_STATUS = new Set(['open', 'finalized']);
const APPROVAL_STATUS = new Set(['pending', 'approved', 'rejected']);
const uuid = /^[0-9a-f-]{36}$/i;

const codeOf = (value: unknown) => {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9-]{2,80}$/.test(value.trim()))
    throw new BadRequestException('VALIDATION_ERROR');
  return value.trim();
};
const text = (value: unknown, length: number) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > length)
    throw new BadRequestException('VALIDATION_ERROR');
  return value.trim();
};

/**
 * G1-W6 (R5): 省市区代理地理层级树 — 对标美团平台/代理 PC (MP-01~03).
 *
 * - MP-01 list/create 省市区代理树（agent_regions + platform_agents，省→市→区 parent 关系）
 * - MP-02 商户入驻开通：将有效商户租户归属到具体省/市/区代理商（agent_merchant_affiliations）
 * - MP-03 渠道/代理商后台读取同一组表
 *
 * Honest boundary: 本地试点记录；未接美团实时代理/入驻数据。
 */
@Injectable()
export class PlatformAgentService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  // MP-01: 省市区代理树 + 系统内有效商户池。
  async list() {
    const regions = (
      await this.pool.query(
        `select r.id,r.code,r.name,r.level,r.parent_region_id,
                (select count(*)::int from platform_agents a where a.region_id=r.id and a.tenant_id=r.tenant_id and a.deleted_at is null) agent_count
         from agent_regions r
         where r.deleted_at is null
         order by r.level,r.name`,
      )
    ).rows;

    const agents = (
      await this.pool.query(
        `select a.id,a.agent_level,a.code,a.name,a.parent_agent_id,r.id as region_id,r.name as region_name,r.level as region_level,r.code as region_code,a.status,
                (select count(*)::int from agent_merchant_affiliations m where m.agent_id=a.id and m.tenant_id=a.tenant_id and m.deleted_at is null and m.affiliation_status<>'paused') merchant_count
         from platform_agents a
         join agent_regions r on r.id=a.region_id and r.tenant_id=a.tenant_id
         where a.deleted_at is null
         order by a.agent_level,a.name`,
      )
    ).rows;

    const affiliations = (
      await this.pool.query(
        `select m.id,m.agent_id,m.merchant_tenant_id,m.affiliation_status,t.slug,t.name,a.name as agent_name,r.name as region_name
         from agent_merchant_affiliations m
         join platform_agents a on a.id=m.agent_id and a.tenant_id=m.tenant_id
         join agent_regions r on r.id=a.region_id
         join tenants t on t.id=m.merchant_tenant_id and t.deleted_at is null
         where m.deleted_at is null
         order by m.created_at desc`,
      )
    ).rows;

    const merchantPool = (
      await this.pool.query(
        `select t.id,t.slug,t.name,t.status from tenants t
         where t.status='active' and t.deleted_at is null
           and not exists(select 1 from agent_merchant_affiliations m where m.merchant_tenant_id=t.id and m.deleted_at is null)
         order by t.name`,
      )
    ).rows;

    const quotas = (
      await this.pool.query(
        `select q.id,q.agent_id,q.merchant_quota,
                (select count(*)::int from agent_merchant_affiliations m where m.agent_id=q.agent_id and m.tenant_id=q.tenant_id and m.deleted_at is null and m.affiliation_status<>'paused') used_merchants
         from agent_quotas q
         where q.deleted_at is null
         order by q.agent_id`,
      )
    ).rows;

    const settlements = (
      await this.pool.query(
        `select s.id,s.agent_id,s.period_code,s.period_start,s.period_end,s.settlement_status,s.amount_cents,
                a.name as agent_name,r.name as region_name
         from agent_settlements s
         join platform_agents a on a.id=s.agent_id
         join agent_regions r on r.id=a.region_id
         where s.deleted_at is null
         order by s.created_at desc`,
      )
    ).rows;

    const approvals = (
      await this.pool.query(
        `select o.id,o.agent_id,o.merchant_tenant_id,o.approval_status,t.slug,t.name,a.name as agent_name,r.name as region_name
         from agent_onboarding_approvals o
         join platform_agents a on a.id=o.agent_id
         join agent_regions r on r.id=a.region_id
         join tenants t on t.id=o.merchant_tenant_id and t.deleted_at is null
         where o.deleted_at is null
         order by o.created_at desc`,
      )
    ).rows;

    return {
      regions: regions.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        level: row.level,
        parentRegionId: row.parent_region_id,
        agentCount: row.agent_count,
      })),
      agents: agents.map((row) => ({
        id: row.id,
        agentLevel: row.agent_level,
        code: row.code,
        name: row.name,
        parentAgentId: row.parent_agent_id,
        regionId: row.region_id,
        regionName: row.region_name,
        regionLevel: row.region_level,
        regionCode: row.region_code,
        status: row.status,
        merchantCount: row.merchant_count,
      })),
      affiliations: affiliations.map((row) => ({
        id: row.id,
        agentId: row.agent_id,
        merchantTenantId: row.merchant_tenant_id,
        affiliationStatus: row.affiliation_status,
        slug: row.slug,
        name: row.name,
        agentName: row.agent_name,
        regionName: row.region_name,
      })),
      merchantPool: merchantPool.map((row) => ({
        tenantId: row.id,
        slug: row.slug,
        name: row.name,
        status: row.status,
      })),
      quotas: quotas.map((row) => ({
        id: row.id,
        agentId: row.agent_id,
        merchantQuota: row.merchant_quota,
        usedMerchants: row.used_merchants,
      })),
      settlements: settlements.map((row) => ({
        id: row.id,
        agentId: row.agent_id,
        agentName: row.agent_name,
        regionName: row.region_name,
        periodCode: row.period_code,
        periodStart: row.period_start,
        periodEnd: row.period_end,
        settlementStatus: row.settlement_status,
        amountCents: row.amount_cents,
      })),
      approvals: approvals.map((row) => ({
        id: row.id,
        agentId: row.agent_id,
        agentName: row.agent_name,
        regionName: row.region_name,
        merchantTenantId: row.merchant_tenant_id,
        slug: row.slug,
        name: row.name,
        approvalStatus: row.approval_status,
      })),
    };
  }

  async createRegion(context: OrganizationContext, body: Record<string, unknown>) {
    const input = {
      code: codeOf(body.code).toUpperCase(),
      name: text(body.name, 160),
      level: String(body.level ?? ''),
      parentRegionId: String(body.parentRegionId ?? ''),
    };
    if (!LEVELS.has(input.level)) throw new BadRequestException('VALIDATION_ERROR');
    if (input.parentRegionId && !uuid.test(input.parentRegionId))
      throw new BadRequestException('VALIDATION_ERROR');
    const regionId = randomUUID();
    try {
      await this.pool.query(
        `insert into agent_regions(id,tenant_id,code,name,level,parent_region_id,created_by,updated_by)
         values($1,$2,$3,$4,$5,$6,$7,$7)`,
        [regionId, context.tenantId, input.code, input.name, input.level, input.parentRegionId || null, context.userId],
      );
    } catch (error: unknown) {
      if ((error as { code?: string }).code === '23505') throw new ConflictException('CONFLICT');
      throw error;
    }
    return { id: regionId, code: input.code, name: input.name, level: input.level, parentRegionId: input.parentRegionId || null };
  }

  async createAgent(context: OrganizationContext, body: Record<string, unknown>) {
    const input = {
      regionId: String(body.regionId ?? ''),
      agentLevel: String(body.agentLevel ?? ''),
      code: codeOf(body.code),
      name: text(body.name, 160),
      parentAgentId: String(body.parentAgentId ?? ''),
      status: String(body.status ?? 'active'),
    };
    if (
      !uuid.test(input.regionId) ||
      !LEVELS.has(input.agentLevel) ||
      !AGENT_STATUS.has(input.status) ||
      (input.parentAgentId && !uuid.test(input.parentAgentId))
    )
      throw new BadRequestException('VALIDATION_ERROR');
    const region = (
      await this.pool.query('select id,name,level,tenant_id from agent_regions where id=$1 and deleted_at is null', [
        input.regionId,
      ])
    ).rows[0];
    if (!region) throw new BadRequestException('VALIDATION_ERROR');
    const agentId = randomUUID();
    try {
      await this.pool.query(
        `insert into platform_agents(id,tenant_id,region_id,agent_level,code,name,parent_agent_id,status,created_by,updated_by)
         values($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)`,
        [agentId, context.tenantId, input.regionId, input.agentLevel, input.code, input.name, input.parentAgentId || null, input.status, context.userId],
      );
    } catch (error: unknown) {
      if ((error as { code?: string }).code === '23505') throw new ConflictException('CONFLICT');
      throw error;
    }
    return {
      id: agentId,
      regionId: input.regionId,
      regionName: region.name,
      regionLevel: region.level,
      agentLevel: input.agentLevel,
      code: input.code,
      name: input.name,
      parentAgentId: input.parentAgentId || null,
      status: input.status,
    };
  }

  async affiliate(context: OrganizationContext, agentId: string, body: Record<string, unknown>) {
    if (!uuid.test(agentId)) throw new BadRequestException('VALIDATION_ERROR');
    const input = { merchantTenantId: String(body.merchantTenantId ?? '') };
    if (!uuid.test(input.merchantTenantId)) throw new BadRequestException('VALIDATION_ERROR');
    const agent = (
      await this.pool.query('select id,tenant_id from platform_agents where id=$1 and deleted_at is null', [agentId])
    ).rows[0];
    if (!agent) throw new BadRequestException('VALIDATION_ERROR');
    const merchant = (
      await this.pool.query('select id,slug,name from tenants where id=$1 and status=$2 and deleted_at is null', [
        input.merchantTenantId,
        'active',
      ])
    ).rows[0];
    if (!merchant) throw new BadRequestException('MERCHANT_TENANT_NOT_AVAILABLE');
    const id = randomUUID();
    try {
      await this.pool.query(
        `insert into agent_merchant_affiliations(id,tenant_id,agent_id,merchant_tenant_id,affiliation_status,created_by,updated_by)
         values($1,$2,$3,$4,'active',$5,$5)`,
        [id, context.tenantId, agentId, input.merchantTenantId, context.userId],
      );
    } catch (error: unknown) {
      if ((error as { code?: string }).code === '23505') throw new ConflictException('CONFLICT');
      throw error;
    }
    return {
      id,
      agentId,
      merchantTenantId: merchant.id,
      slug: merchant.slug,
      name: merchant.name,
      affiliationStatus: 'active',
    };
  }

  // 配额：为代理商设定可开通商户席位数；超出配额将拒绝对接新商户归属。
  async setQuota(
    context: OrganizationContext,
    agentId: string,
    body: Record<string, unknown>,
  ): Promise<{ id: string; agentId: string; merchantQuota: number; usedMerchants: number }> {
    if (!uuid.test(agentId)) throw new BadRequestException('VALIDATION_ERROR');
    const quota = Number(body.merchantQuota ?? '');
    if (!Number.isInteger(quota) || quota < 0 || quota > 1_000_000)
      throw new BadRequestException('VALIDATION_ERROR');
    const agent = (
      await this.pool.query('select id,tenant_id from platform_agents where id=$1 and deleted_at is null', [agentId])
    ).rows[0];
    if (!agent) throw new BadRequestException('VALIDATION_ERROR');
    const used = Number(
      (
        await this.pool.query(
          `select count(*)::int as c from agent_merchant_affiliations
           where agent_id=$1 and deleted_at is null and affiliation_status<>'paused'`,
          [agentId],
        )
      ).rows[0].c,
    );
    if (quota < used) throw new BadRequestException('QUOTA_BELOW_USED');
    const existing = (
      await this.pool.query('select id from agent_quotas where agent_id=$1 and deleted_at is null', [agentId])
    ).rows[0];
    if (existing) {
      await this.pool.query('update agent_quotas set merchant_quota=$1,updated_by=$2,updated_at=now() where id=$3', [
        quota,
        context.userId,
        existing.id,
      ]);
      return { id: existing.id, agentId, merchantQuota: quota, usedMerchants: used };
    }
    const id = randomUUID();
    try {
      await this.pool.query(
        `insert into agent_quotas(id,tenant_id,agent_id,merchant_quota,created_by,updated_by)
         values($1,$2,$3,$4,$5,$5)`,
        [id, context.tenantId, agentId, quota, context.userId],
      );
    } catch (error: unknown) {
      if ((error as { code?: string }).code === '23505') {
        return this.setQuota(context, agentId, body);
      }
      throw error;
    }
    return { id, agentId, merchantQuota: quota, usedMerchants: used };
  }

  // 结算：开启一个周期结算期；结算期不可重复。
  async createSettlement(context: OrganizationContext, agentId: string, body: Record<string, unknown>) {
    if (!uuid.test(agentId)) throw new BadRequestException('VALIDATION_ERROR');
    const agent = (
      await this.pool.query('select id,tenant_id from platform_agents where id=$1 and deleted_at is null', [agentId])
    ).rows[0];
    if (!agent) throw new BadRequestException('VALIDATION_ERROR');
    const periodCode = String(body.periodCode ?? '').trim();
    const periodStart = String(body.periodStart ?? '').trim();
    const periodEnd = String(body.periodEnd ?? '').trim();
    if (
      !/^[A-Z0-9-]{2,32}$/.test(periodCode) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(periodStart) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(periodEnd)
    )
      throw new BadRequestException('VALIDATION_ERROR');
    if (periodEnd < periodStart) throw new BadRequestException('VALIDATION_ERROR');
    const id = randomUUID();
    try {
      await this.pool.query(
        `insert into agent_settlements(id,tenant_id,agent_id,period_code,period_start,period_end,settlement_status,amount_cents,created_by,updated_by)
         values($1,$2,$3,$4,$5,$6,'open',0,$7,$7)`,
        [id, context.tenantId, agentId, periodCode, periodStart, periodEnd, context.userId],
      );
    } catch (error: unknown) {
      if ((error as { code?: string }).code === '23505') throw new ConflictException('CONFLICT');
      throw error;
    }
    return { id, agentId, periodCode, periodStart, periodEnd, settlementStatus: 'open', amountCents: 0 };
  }

  // 结算：按已归属商户数更新应收金额并关闭结算期。
  async finalizeSettlement(context: OrganizationContext, settlementId: string, body: Record<string, unknown>) {
    if (!uuid.test(settlementId)) throw new BadRequestException('VALIDATION_ERROR');
    const unitCents = Number(body.unitCents ?? 0);
    if ((!Number.isInteger(unitCents) || unitCents < 0) && unitCents !== 0)
      throw new BadRequestException('VALIDATION_ERROR');
    const settlement = (
      await this.pool.query('select id,agent_id,settlement_status from agent_settlements where id=$1 and deleted_at is null', [
        settlementId,
      ])
    ).rows[0];
    if (!settlement) throw new BadRequestException('VALIDATION_ERROR');
    if (settlement.settlement_status === 'finalized') throw new ConflictException('CONFLICT');
    const merchants = Number(
      (
        await this.pool.query(
          `select count(*)::int as c from agent_merchant_affiliations
           where agent_id=$1 and deleted_at is null and affiliation_status<>'paused'`,
          [settlement.agent_id],
        )
      ).rows[0].c,
    );
    const amountCents = merchants * unitCents;
    await this.pool.query(
      `update agent_settlements set settlement_status='finalized',amount_cents=$1,updated_by=$2,updated_at=now() where id=$3`,
      [BigInt(amountCents), context.userId, settlementId],
    );
    return { id: settlementId, agentId: settlement.agent_id, merchantCount: merchants, amountCents };
  }

  // 审批：为代理商发起商户入驻开通审批（pending → approved 之后触发归属）。
  async requestApproval(context: OrganizationContext, agentId: string, body: Record<string, unknown>) {
    if (!uuid.test(agentId)) throw new BadRequestException('VALIDATION_ERROR');
    const merchantTenantId = String(body.merchantTenantId ?? '');
    if (!uuid.test(merchantTenantId)) throw new BadRequestException('VALIDATION_ERROR');
    const agent = (
      await this.pool.query('select id,tenant_id from platform_agents where id=$1 and deleted_at is null', [agentId])
    ).rows[0];
    if (!agent) throw new BadRequestException('VALIDATION_ERROR');
    const merchant = (
      await this.pool.query('select id,slug,name from tenants where id=$1 and status=$2 and deleted_at is null', [
        merchantTenantId,
        'active',
      ])
    ).rows[0];
    if (!merchant) throw new BadRequestException('MERCHANT_TENANT_NOT_AVAILABLE');
    const id = randomUUID();
    try {
      await this.pool.query(
        `insert into agent_onboarding_approvals(id,tenant_id,agent_id,merchant_tenant_id,approval_status,requested_by,created_by,updated_by)
         values($1,$2,$3,$4,'pending',$5,$5,$5)`,
        [id, context.tenantId, agentId, merchantTenantId, context.userId],
      );
    } catch (error: unknown) {
      if ((error as { code?: string }).code === '23505') throw new ConflictException('CONFLICT');
      throw error;
    }
    return { id, agentId, merchantTenantId, slug: merchant.slug, name: merchant.name, approvalStatus: 'pending' };
  }

  // 审批裁决：approved 时执行商户归属（复用 affiliate 逻辑）；rejected 归档。
  async decideApproval(context: OrganizationContext, approvalId: string, body: Record<string, unknown>) {
    if (!uuid.test(approvalId)) throw new BadRequestException('VALIDATION_ERROR');
    const decision = String(body.approvalStatus ?? '');
    if (!APPROVAL_STATUS.has(decision) || decision === 'pending') throw new BadRequestException('VALIDATION_ERROR');
    const approval = (
      await this.pool.query(
        'select id,agent_id,merchant_tenant_id,approval_status,tenant_id from agent_onboarding_approvals where id=$1 and deleted_at is null',
        [approvalId],
      )
    ).rows[0];
    if (!approval) throw new BadRequestException('VALIDATION_ERROR');
    if (approval.approval_status !== 'pending') throw new ConflictException('CONFLICT');
    if (decision === 'approved') {
      await this.pool.query(
        `update agent_onboarding_approvals set approval_status='approved',approved_by=$1,approved_at=now(),updated_by=$1,updated_at=now() where id=$2`,
        [context.userId, approvalId],
      );
      const affiliation = await this.affiliate(context, approval.agent_id, {
        merchantTenantId: approval.merchant_tenant_id,
      });
      return {
        id: approvalId,
        agentId: approval.agent_id,
        merchantTenantId: approval.merchant_tenant_id,
        approvalStatus: 'approved',
        affiliationId: affiliation.id,
      };
    }
    await this.pool.query(
      `update agent_onboarding_approvals set approval_status='rejected',approved_by=$1,updated_by=$1,updated_at=now() where id=$2`,
      [context.userId, approvalId],
    );
    return { id: approvalId, agentId: approval.agent_id, merchantTenantId: approval.merchant_tenant_id, approvalStatus: 'rejected' };
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
