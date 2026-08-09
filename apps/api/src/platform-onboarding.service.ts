import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID, scryptSync } from 'node:crypto';
import type { PoolClient } from 'pg';
import { createApiPool } from './database-pool';
import type { OrganizationContext } from './organization.service';

const INDUSTRIES = new Set(['restaurant', 'beauty', 'education', 'retail']);
const PLANS = new Set(['starter', 'growth', 'enterprise']);
const STEP_CODES = [
  'validate_reserve',
  'tenant_foundation',
  'owner_role_packs',
  'organization_store',
  'industry_template',
  'storefront_publish',
  'commercial_defaults',
  'channel_circle',
  'one_code_delivery',
  'activate_verify',
  'ready_handoff',
] as const;

const text = (value: unknown, max: number) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max)
    throw new BadRequestException('VALIDATION_ERROR');
  return value.trim();
};
const optionalText = (value: unknown, max: number) => {
  if (value === undefined || value === null || value === '') return null;
  return text(value, max);
};
const slug = (value: unknown) => {
  const normalized = text(value, 63);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(normalized)) throw new BadRequestException('VALIDATION_ERROR');
  return normalized;
};
const coordinate = (value: unknown, min: number, max: number) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max)
    throw new BadRequestException('VALIDATION_ERROR');
  return parsed;
};
const industryFrom = (body: Record<string, unknown>) => {
  const candidate = body.industry ?? body.template;
  const aliases: Record<string, string> = { starter: 'restaurant', service: 'beauty' };
  const value = aliases[String(candidate)] ?? String(candidate);
  if (!INDUSTRIES.has(value)) throw new BadRequestException('VALIDATION_ERROR');
  return value;
};

type Input = ReturnType<PlatformOnboardingService['input']>;

const industryCatalog: Record<
  string,
  {
    label: string;
    channels: string[];
    modules: { type: string; config: Record<string, unknown> }[];
    service: { name: string; description: string };
    benefit: { title: string; description: string };
    content: { title: string; summary: string };
  }
> = {
  restaurant: {
    label: '餐饮',
    channels: ['menu', 'group-buy', 'membership'],
    modules: [
      { type: 'store_hero', config: { emphasis: 'nearby_visit' } },
      { type: 'banner_carousel', config: { limit: 3 } },
      { type: 'quick_actions', config: { capabilities: ['consult', 'phone', 'navigation'] } },
      { type: 'offer_compare', config: { source: 'store_service_platform_offers' } },
      { type: 'service_catalog', config: { presentation: 'menu' } },
      { type: 'member_entry', config: { mode: 'enrollment' } },
      { type: 'content_feed', config: { kind: 'store_story' } },
      { type: 'store_info', config: {} },
    ],
    service: { name: '门店招牌与套餐', description: '商家可在经营后台补充套餐明细与价格。' },
    benefit: { title: '新会员到店礼', description: '完成入会后发放；具体内容由商家确认。' },
    content: { title: '欢迎来到本店', summary: '门店动态与活动可在经营后台持续更新。' },
  },
  beauty: {
    label: '美业',
    channels: ['services', 'cases', 'membership'],
    modules: [
      { type: 'store_hero', config: { emphasis: 'trust' } },
      { type: 'quick_actions', config: { capabilities: ['consult', 'appointment'] } },
      { type: 'service_catalog', config: { presentation: 'service_cards' } },
      { type: 'content_feed', config: { kind: 'cases' } },
      { type: 'member_entry', config: { mode: 'enrollment' } },
      { type: 'store_info', config: {} },
    ],
    service: { name: '专业服务咨询', description: '服务时长与预约档期以门店确认结果为准。' },
    benefit: { title: '会员到店权益', description: '完成入会后发放；不包含未确认的价格承诺。' },
    content: { title: '服务案例与门店动态', summary: '商家可发布已获授权的案例和服务内容。' },
  },
  education: {
    label: '教育',
    channels: ['courses', 'events', 'membership'],
    modules: [
      { type: 'store_hero', config: { emphasis: 'campus_trust' } },
      { type: 'quick_actions', config: { capabilities: ['consult', 'trial'] } },
      { type: 'service_catalog', config: { presentation: 'courses' } },
      { type: 'content_feed', config: { kind: 'events' } },
      { type: 'store_info', config: { label: '校区信息' } },
      { type: 'member_entry', config: { mode: 'enrollment' } },
    ],
    service: { name: '课程与试听咨询', description: '课程安排和适龄信息由校区顾问确认。' },
    benefit: { title: '会员活动权益', description: '完成入会后可查看校区确认的活动权益。' },
    content: { title: '校区活动与课程动态', summary: '仅发布经商家确认的课程和活动信息。' },
  },
  retail: {
    label: '新零售',
    channels: ['catalog', 'events', 'membership'],
    modules: [
      { type: 'store_hero', config: { emphasis: 'catalog' } },
      { type: 'quick_actions', config: { capabilities: ['consult', 'phone', 'navigation'] } },
      { type: 'service_catalog', config: { presentation: 'catalog' } },
      { type: 'banner_carousel', config: { limit: 3 } },
      { type: 'member_entry', config: { mode: 'enrollment' } },
      { type: 'store_info', config: { deliveryClaim: 'merchant_confirmed_only' } },
    ],
    service: { name: '商品目录咨询', description: '库存、价格和配送范围以商家最终确认为准。' },
    benefit: { title: '会员到店权益', description: '完成入会后发放；不代表实时库存或价格。' },
    content: { title: '门店新品与活动', summary: '商家可在经营后台维护已确认的商品活动。' },
  },
};

@Injectable()
export class PlatformOnboardingService implements OnModuleDestroy {
  private readonly pool = createApiPool();

  private input(body: Record<string, unknown>) {
    const plan = String(body.plan ?? 'starter');
    if (!PLANS.has(plan)) throw new BadRequestException('VALIDATION_ERROR');
    const input = {
      slug: slug(body.slug),
      tenantName: text(body.tenantName, 160),
      organizationName: text(body.organizationName, 160),
      merchantName: optionalText(body.merchantName, 160) ?? text(body.tenantName, 160),
      storeName: text(body.storeName, 160),
      address: text(body.address, 500),
      phone: text(body.phone, 48),
      businessHours: text(body.businessHours, 240),
      latitude: coordinate(body.latitude, -90, 90),
      longitude: coordinate(body.longitude, -180, 180),
      adminEmail: text(body.adminEmail, 320).toLowerCase(),
      adminName: text(body.adminName, 160),
      adminPassword: text(body.adminPassword, 128),
      industry: industryFrom(body),
      plan,
      themeVariant: optionalText(body.themeVariant, 48) ?? 'signature',
      sourceMode: body.sourceMode === 'channel_referral' ? 'channel_referral' : 'platform_direct',
    };
    if (!/.+@.+\..+/.test(input.adminEmail) || input.adminPassword.length < 12)
      throw new BadRequestException('VALIDATION_ERROR');
    return input;
  }

  async create(
    context: OrganizationContext,
    body: Record<string, unknown>,
    key: string,
    requestId: string,
  ) {
    if (!key.trim() || key.length > 200) throw new BadRequestException('VALIDATION_ERROR');
    const input = this.input(body);
    const existing = await this.pool.query(
      'select id from tenant_provisioning_runs where requested_by_tenant_id=$1 and idempotency_key=$2 and deleted_at is null',
      [context.tenantId, key],
    );
    if (existing.rowCount) return this.get(context, existing.rows[0].id);

    const runId = randomUUID();
    const correlationId = /^[0-9a-f-]{36}$/i.test(requestId) ? requestId : randomUUID();
    try {
      await this.pool.query(
        "insert into tenant_provisioning_runs(id,requested_by_tenant_id,source_mode,request_slug,idempotency_key,state,industry,plan,input,correlation_id,created_by,updated_by) values($1,$2,$3,$4,$5,'draft',$6,$7,$8,$9,$10,$10)",
        [
          runId,
          context.tenantId,
          input.sourceMode,
          input.slug,
          key,
          input.industry,
          input.plan,
          this.safeInput(input),
          correlationId,
          context.userId,
        ],
      );
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        const replay = await this.pool.query(
          'select id from tenant_provisioning_runs where requested_by_tenant_id=$1 and idempotency_key=$2 and deleted_at is null',
          [context.tenantId, key],
        );
        if (replay.rowCount) return this.get(context, replay.rows[0].id);
      }
      throw error;
    }

    const client = await this.pool.connect();
    try {
      await client.query('begin');
      await client.query(
        "update tenant_provisioning_runs set state='validating',updated_at=now(),updated_by=$2 where id=$1",
        [runId, context.userId],
      );
      for (const [position, code] of STEP_CODES.entries()) {
        await client.query(
          "insert into tenant_provisioning_steps(id,run_id,step_code,position,state,created_by,updated_by) values($1,$2,$3,$4,'pending',$5,$5)",
          [randomUUID(), runId, code, position, context.userId],
        );
      }
      await this.completeStep(client, runId, 'validate_reserve', { slug: input.slug });
      await client.query(
        "update tenant_provisioning_runs set state='provisioning',updated_at=now() where id=$1",
        [runId],
      );
      const resources = await this.provision(client, context, input, runId, correlationId);
      await client.query(
        "update tenant_provisioning_runs set tenant_id=$2,state='ready',delivery=$3,verification=$4,ready_at=now(),updated_at=now(),updated_by=$5 where id=$1",
        [runId, resources.tenantId, resources.delivery, resources.verification, context.userId],
      );
      await client.query('commit');
      return this.get(context, runId);
    } catch (error) {
      await client.query('rollback');
      const terminal = error instanceof ConflictException || error instanceof BadRequestException;
      await this.pool.query(
        'update tenant_provisioning_runs set state=$2,error_code=$3,error_detail=$4,updated_at=now(),updated_by=$5 where id=$1',
        [
          runId,
          terminal ? 'failed_terminal' : 'failed_recoverable',
          terminal ? 'VALIDATION_OR_CONFLICT' : 'PROVISIONING_FAILED',
          error instanceof Error ? error.message.slice(0, 1000) : 'Unknown provisioning failure',
          context.userId,
        ],
      );
      throw error;
    } finally {
      client.release();
    }
  }

  async get(context: OrganizationContext, runId: string) {
    if (!/^[0-9a-f-]{36}$/i.test(runId)) throw new BadRequestException('VALIDATION_ERROR');
    const run = (
      await this.pool.query(
        'select id,tenant_id,source_mode,request_slug,state,industry,plan,delivery,verification,correlation_id,error_code,error_detail,ready_at,created_at,updated_at from tenant_provisioning_runs where id=$1 and requested_by_tenant_id=$2 and deleted_at is null',
        [runId, context.tenantId],
      )
    ).rows[0];
    if (!run) throw new NotFoundException('NOT_FOUND');
    const steps = (
      await this.pool.query(
        'select step_code,position,state,attempts,started_at,ended_at,error_code,output from tenant_provisioning_steps where run_id=$1 and deleted_at is null order by position',
        [runId],
      )
    ).rows;
    return {
      runId: run.id,
      tenantId: run.tenant_id,
      slug: run.request_slug,
      sourceMode: run.source_mode,
      state: run.state,
      industry: run.industry,
      plan: run.plan,
      delivery: run.delivery,
      verification: run.verification,
      correlationId: run.correlation_id,
      errorCode: run.error_code,
      errorDetail: run.error_detail,
      readyAt: run.ready_at,
      createdAt: run.created_at,
      updatedAt: run.updated_at,
      steps: steps.map((step) => ({
        code: step.step_code,
        position: step.position,
        state: step.state,
        attempts: step.attempts,
        startedAt: step.started_at,
        endedAt: step.ended_at,
        errorCode: step.error_code,
        output: step.output,
      })),
    };
  }

  private async provision(
    client: PoolClient,
    context: OrganizationContext,
    input: Input,
    runId: string,
    correlationId: string,
  ) {
    const existing = await client.query(
      'select 1 from tenants where slug=$1 union all select 1 from users where email=$2',
      [input.slug, input.adminEmail],
    );
    if (existing.rowCount) throw new ConflictException('CONFLICT');

    const ids = {
      tenantId: randomUUID(),
      userId: randomUUID(),
      membershipId: randomUUID(),
      employeeId: randomUUID(),
      orgId: randomUUID(),
      merchantId: randomUUID(),
      storeId: randomUUID(),
      templateId: randomUUID(),
      templateVersionId: randomUUID(),
      bindingId: randomUUID(),
      actionId: randomUUID(),
      serviceId: randomUUID(),
      benefitId: randomUUID(),
    };
    await client.query(
      'insert into tenants(id,slug,name,created_by,updated_by) values($1,$2,$3,$4,$4)',
      [ids.tenantId, input.slug, input.tenantName, context.userId],
    );
    await client.query(
      "insert into platform_tenant_settings(id,tenant_id,plan,quotas,risk_level,created_by,updated_by) values($1,$2,$3,$4,'low',$5,$5)",
      [randomUUID(), ids.tenantId, input.plan, this.quotas(input.plan), context.userId],
    );
    await client.query(
      'insert into tenant_operating_settings(id,tenant_id,reminder_policy,approval_policy,do_not_disturb_policy,tag_policy,ownership_policy,brand_policy,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)',
      [
        randomUUID(),
        ids.tenantId,
        { dueMinutes: 120, overdueEscalationMinutes: 60 },
        { highRiskRequiresConfirmation: true },
        { enabled: false, start: '22:00', end: '08:00' },
        { allowed: [] },
        { mode: 'store_manager_then_pool' },
        { name: input.tenantName, themeVariant: input.themeVariant },
        context.userId,
      ],
    );
    await this.completeStep(client, runId, 'tenant_foundation', { tenantId: ids.tenantId });

    await client.query(
      'insert into users(id,email,display_name,password_hash,created_by,updated_by) values($1,$2,$3,$4,$5,$5)',
      [
        ids.userId,
        input.adminEmail,
        input.adminName,
        `scrypt$oneday-onboarding$${scryptSync(input.adminPassword, 'oneday-onboarding', 64).toString('base64url')}`,
        context.userId,
      ],
    );
    await client.query(
      'insert into memberships(id,tenant_id,user_id,created_by,updated_by) values($1,$2,$3,$4,$4)',
      [ids.membershipId, ids.tenantId, ids.userId, context.userId],
    );
    const roles = await this.createRolePacks(client, ids.tenantId, context.userId);
    await client.query(
      'insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,$4)',
      [randomUUID(), ids.tenantId, ids.membershipId, roles.owner],
    );
    await this.completeStep(client, runId, 'owner_role_packs', {
      ownerUserId: ids.userId,
      roleCodes: ['owner', 'store_manager', 'employee'],
    });

    await client.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,created_by,updated_by) values($1,$2,'HQ',$3,'headquarters',$4,$4)",
      [ids.orgId, ids.tenantId, input.organizationName, context.userId],
    );
    await client.query(
      "insert into merchants(id,tenant_id,organization_id,code,name,created_by,updated_by) values($1,$2,$3,'PRIMARY',$4,$5,$5)",
      [ids.merchantId, ids.tenantId, ids.orgId, input.merchantName, context.userId],
    );
    await client.query(
      "insert into stores(id,tenant_id,organization_id,merchant_id,code,name,address,phone,business_hours,latitude,longitude,created_by,updated_by) values($1,$2,$3,$4,'MAIN',$5,$6,$7,$8,$9,$10,$11,$11)",
      [
        ids.storeId,
        ids.tenantId,
        ids.orgId,
        ids.merchantId,
        input.storeName,
        input.address,
        input.phone,
        input.businessHours,
        input.latitude,
        input.longitude,
        context.userId,
      ],
    );
    await client.query(
      "insert into employees(id,tenant_id,membership_id,organization_id,employee_code,title,created_by,updated_by) values($1,$2,$3,$4,'OWNER','Owner / 首店负责人',$5,$5)",
      [ids.employeeId, ids.tenantId, ids.membershipId, ids.orgId, context.userId],
    );
    await client.query(
      'insert into store_managers(id,tenant_id,store_id,employee_id,created_by,updated_by) values($1,$2,$3,$4,$5,$5)',
      [randomUUID(), ids.tenantId, ids.storeId, ids.employeeId, context.userId],
    );
    await this.completeStep(client, runId, 'organization_store', {
      organizationId: ids.orgId,
      merchantId: ids.merchantId,
      storeId: ids.storeId,
    });

    const catalog = industryCatalog[input.industry]!;
    const industryConfig = {
      family: input.industry,
      label: catalog.label,
      themeVariant: input.themeVariant,
      schemaVersion: 1,
      channels: catalog.channels,
    };
    await client.query(
      "insert into page_templates(id,tenant_id,code,name,target,industry_config,created_by,updated_by) values($1,$2,'consumer-storefront',$3,'consumer',$4,$5,$5)",
      [
        ids.templateId,
        ids.tenantId,
        `${input.tenantName} ${catalog.label}店铺`,
        industryConfig,
        context.userId,
      ],
    );
    await client.query(
      "insert into page_template_versions(id,tenant_id,template_id,sequence,status,created_by,updated_by) values($1,$2,$3,1,'published',$4,$4)",
      [ids.templateVersionId, ids.tenantId, ids.templateId, context.userId],
    );
    for (const [position, module] of catalog.modules.entries()) {
      await client.query(
        'insert into page_modules(id,tenant_id,template_version_id,module_type,position,config,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$7)',
        [
          randomUUID(),
          ids.tenantId,
          ids.templateVersionId,
          module.type,
          position,
          module.config,
          context.userId,
        ],
      );
    }
    await this.completeStep(client, runId, 'industry_template', {
      templateId: ids.templateId,
      draftVersionId: ids.templateVersionId,
      family: input.industry,
      modules: catalog.modules.length,
    });

    await client.query(
      'update page_templates set published_version_id=$1,version=version+1,updated_at=now(),updated_by=$2 where id=$3',
      [ids.templateVersionId, context.userId, ids.templateId],
    );
    await client.query(
      "insert into storefront_bindings(id,tenant_id,store_id,template_id,draft_version_id,live_version_id,status,published_at,created_by,updated_by) values($1,$2,$3,$4,$5,$5,'active',now(),$6,$6)",
      [
        ids.bindingId,
        ids.tenantId,
        ids.storeId,
        ids.templateId,
        ids.templateVersionId,
        context.userId,
      ],
    );
    await client.query(
      "insert into storefront_publications(id,tenant_id,binding_id,template_version_id,publication_type,sequence,correlation_id,created_by,updated_by) values($1,$2,$3,$4,'publish',1,$5,$6,$6)",
      [
        randomUUID(),
        ids.tenantId,
        ids.bindingId,
        ids.templateVersionId,
        correlationId,
        context.userId,
      ],
    );
    await this.completeStep(client, runId, 'storefront_publish', {
      bindingId: ids.bindingId,
      liveVersionId: ids.templateVersionId,
    });

    await client.query(
      "insert into external_actions(id,tenant_id,code,name,action_type,created_by,updated_by) values($1,$2,'store-consult','到店/服务咨询','consultation',$3,$3)",
      [ids.actionId, ids.tenantId, context.userId],
    );
    await client.query(
      'insert into store_external_actions(id,tenant_id,store_id,external_action_id,description,sort_order,created_by,updated_by) values($1,$2,$3,$4,$5,0,$6,$6)',
      [
        randomUUID(),
        ids.tenantId,
        ids.storeId,
        ids.actionId,
        '由门店员工承接并记录进度',
        context.userId,
      ],
    );
    await client.query(
      "insert into store_services(id,tenant_id,store_id,code,name,description,price_label,rank,created_by,updated_by) values($1,$2,$3,'starter-service',$4,$5,'价格请咨询门店',100,$6,$6)",
      [
        ids.serviceId,
        ids.tenantId,
        ids.storeId,
        catalog.service.name,
        catalog.service.description,
        context.userId,
      ],
    );
    await client.query(
      'insert into store_benefits(id,tenant_id,store_id,title,description,rank,created_by,updated_by) values($1,$2,$3,$4,$5,100,$6,$6)',
      [
        ids.benefitId,
        ids.tenantId,
        ids.storeId,
        catalog.benefit.title,
        catalog.benefit.description,
        context.userId,
      ],
    );
    await client.query(
      "insert into store_content_items(id,tenant_id,store_id,content_type,title,summary,rank,created_by,updated_by) values($1,$2,$3,'story',$4,$5,100,$6,$6)",
      [
        randomUUID(),
        ids.tenantId,
        ids.storeId,
        catalog.content.title,
        catalog.content.summary,
        context.userId,
      ],
    );
    await this.completeStep(client, runId, 'commercial_defaults', {
      serviceId: ids.serviceId,
      benefitId: ids.benefitId,
      memberPolicy: 'consent_required',
      employeeWorkspace: 'owner_store_manager',
    });
    await this.completeStep(
      client,
      runId,
      'channel_circle',
      { sourceMode: input.sourceMode, circleExposure: 'not_requested' },
      input.sourceMode === 'platform_direct' ? 'skipped' : 'succeeded',
    );

    const code = randomUUID().replaceAll('-', '').slice(0, 20).toUpperCase();
    const consumerPath = `/c/entry?tenant=${encodeURIComponent(input.slug)}&source=one-code:${code}&scene=storefront`;
    const roleTargets = {
      consumer: consumerPath,
      employee: '/e/workbench',
      management: '/m',
    };
    await client.query(
      "insert into one_code_entries(id,tenant_id,store_id,code,scene,source,target_path,role_targets,created_by,updated_by) values($1,$2,$3,$4,'primary','provisioning',$5,$6,$7,$7)",
      [randomUUID(), ids.tenantId, ids.storeId, code, consumerPath, roleTargets, context.userId],
    );
    const delivery = {
      oneCode: code,
      resolvePath: `/api/v1/one-code/${code}`,
      consumerPath,
      ownerEmail: input.adminEmail,
      managementPath: '/m',
      employeePath: '/e/workbench',
    };
    await this.completeStep(client, runId, 'one_code_delivery', delivery);

    const verification = await this.verify(client, ids, input);
    if (!Object.values(verification).every(Boolean)) throw new Error('READY_VERIFICATION_FAILED');
    await this.completeStep(client, runId, 'activate_verify', verification);
    await this.completeStep(client, runId, 'ready_handoff', {
      ready: true,
      tenantId: ids.tenantId,
      storeId: ids.storeId,
    });

    const event = { runId, ...delivery, verification };
    await client.query(
      "insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,'platform.tenant_ready','tenant_provisioning_run',$4,$5,'commercial-provisioning',$6,$3,$3)",
      [randomUUID(), context.tenantId, context.userId, runId, correlationId, event],
    );
    await client.query(
      "insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,'tenant.provisioning.ready.v1','tenant_provisioning_run',$3,$4,$5,'commercial-provisioning',$6,$6)",
      [randomUUID(), context.tenantId, runId, event, correlationId, context.userId],
    );
    await client.query(
      "insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,'storefront.published.v1','storefront_binding',$3,$4,$5,'commercial-provisioning',$6,$6)",
      [
        randomUUID(),
        ids.tenantId,
        ids.bindingId,
        { bindingId: ids.bindingId, liveVersionId: ids.templateVersionId, storeId: ids.storeId },
        correlationId,
        context.userId,
      ],
    );
    return { tenantId: ids.tenantId, delivery, verification };
  }

  private async createRolePacks(client: PoolClient, tenantId: string, actorId: string) {
    const roles = { owner: randomUUID(), storeManager: randomUUID(), employee: randomUUID() };
    for (const [id, code, name] of [
      [roles.owner, 'owner', 'Tenant Owner'],
      [roles.storeManager, 'store_manager', 'Store Manager'],
      [roles.employee, 'employee', 'Employee'],
    ]) {
      await client.query(
        'insert into roles(id,tenant_id,code,name,created_by,updated_by) values($1,$2,$3,$4,$5,$5)',
        [id, tenantId, code, name, actorId],
      );
    }
    const permissions = (
      await client.query(
        "select id,code from permissions where status='active' and deleted_at is null order by code",
      )
    ).rows as { id: string; code: string }[];
    const permissionSets: Record<string, (code: string) => boolean> = {
      [roles.owner]: (code) => !code.startsWith('platform.') && code !== 'circle.manage',
      [roles.storeManager]: (code) =>
        !code.startsWith('platform.') &&
        !['tenant.manage', 'organization.manage', 'employee.manage', 'circle.manage'].includes(
          code,
        ),
      [roles.employee]: (code) =>
        [
          'customer.read',
          'customer.manage',
          'task.read',
          'task.manage',
          'evidence.read',
          'evidence.manage',
          'action.read',
        ].includes(code),
    };
    for (const [roleId, accepts] of Object.entries(permissionSets)) {
      for (const permission of permissions.filter((item) => accepts(item.code))) {
        await client.query(
          'insert into role_permissions(id,tenant_id,role_id,permission_id,created_by,updated_by) values($1,$2,$3,$4,$5,$5)',
          [randomUUID(), tenantId, roleId, permission.id, actorId],
        );
      }
    }
    return roles;
  }

  private async verify(client: PoolClient, ids: Record<string, string>, input: Input) {
    const row = (
      await client.query(
        `select
          exists(select 1 from tenants where id=$1 and slug=$2 and status='active' and deleted_at is null) tenant_active,
          exists(select 1 from platform_tenant_settings where tenant_id=$1 and plan=$3 and deleted_at is null) plan_ready,
          exists(select 1 from memberships m join membership_roles mr on mr.membership_id=m.id and mr.tenant_id=m.tenant_id join roles r on r.id=mr.role_id and r.tenant_id=m.tenant_id where m.id=$4 and m.tenant_id=$1 and m.status='active' and r.code='owner') owner_ready,
          exists(select 1 from employees where id=$5 and tenant_id=$1 and status='active' and deleted_at is null) employee_ready,
          exists(select 1 from stores where id=$6 and tenant_id=$1 and status='active' and address is not null and phone is not null and business_hours is not null and deleted_at is null) store_ready,
          exists(select 1 from storefront_bindings where id=$7 and tenant_id=$1 and live_version_id=$8 and status='active' and deleted_at is null) storefront_published,
          exists(select 1 from page_templates where id=$9 and tenant_id=$1 and published_version_id=$8 and status='active' and deleted_at is null) template_published,
          exists(select 1 from one_code_entries where tenant_id=$1 and store_id=$6 and status='active' and deleted_at is null) one_code_ready,
          not exists(select 1 from outbox_events where tenant_id in ($1,$10) and last_error is not null and deleted_at is null) outbox_clear`,
        [
          ids.tenantId,
          input.slug,
          input.plan,
          ids.membershipId,
          ids.employeeId,
          ids.storeId,
          ids.bindingId,
          ids.templateVersionId,
          ids.templateId,
          ids.tenantId,
        ],
      )
    ).rows[0] as Record<string, boolean>;
    return row;
  }

  private async completeStep(
    client: PoolClient,
    runId: string,
    step: (typeof STEP_CODES)[number],
    output: unknown,
    state: 'succeeded' | 'skipped' = 'succeeded',
  ) {
    await client.query(
      'update tenant_provisioning_steps set state=$3,attempts=attempts+1,started_at=coalesce(started_at,now()),ended_at=now(),output=$4,updated_at=now(),version=version+1 where run_id=$1 and step_code=$2',
      [runId, step, state, output],
    );
  }

  private safeInput(input: Input) {
    return {
      slug: input.slug,
      tenantName: input.tenantName,
      organizationName: input.organizationName,
      merchantName: input.merchantName,
      storeName: input.storeName,
      address: input.address,
      phone: input.phone,
      businessHours: input.businessHours,
      latitude: input.latitude,
      longitude: input.longitude,
      adminEmail: input.adminEmail,
      adminName: input.adminName,
      industry: input.industry,
      plan: input.plan,
      themeVariant: input.themeVariant,
      sourceMode: input.sourceMode,
    };
  }

  private quotas(plan: string) {
    if (plan === 'enterprise') return { stores: 100, employees: 2000, templates: 100 };
    if (plan === 'growth') return { stores: 20, employees: 200, templates: 20 };
    return { stores: 3, employees: 20, templates: 5 };
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
