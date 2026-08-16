import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { createHash, randomBytes, randomUUID, scryptSync } from 'node:crypto';
import type { PoolClient } from 'pg';
import { createApiPool } from './database-pool';
import { DataScopeService } from './data-scope.service';
import type { OrganizationContext } from './organization.service';
import { warmStorefrontReadModelCache } from './storefront-read-model-cache';

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

const hashToken = (value: string) => createHash('sha256').update(value).digest('hex');
const mintActivationToken = () => randomBytes(24).toString('base64url');

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
      {
        type: 'operating_channels',
        config: {
          channels: [
            { code: 'group-buy', label: '团购' },
            { code: 'menu', label: '菜单' },
            { code: 'membership', label: '会员' },
          ],
        },
      },
      { type: 'banner_carousel', config: { limit: 3 } },
      { type: 'quick_actions', config: { capabilities: ['consult', 'phone', 'navigation'] } },
      { type: 'offer_compare', config: { source: 'store_service_platform_offers' } },
      { type: 'service_catalog', config: { presentation: 'menu' } },
      { type: 'member_entry', config: { mode: 'enrollment' } },
      { type: 'member_wallet', config: { mode: 'balances' } },
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
      {
        type: 'operating_channels',
        config: {
          channels: [
            { code: 'services', label: '服务' },
            { code: 'cases', label: '案例' },
            { code: 'membership', label: '会员' },
          ],
        },
      },
      { type: 'quick_actions', config: { capabilities: ['consult', 'appointment'] } },
      { type: 'service_catalog', config: { presentation: 'service_cards' } },
      { type: 'content_feed', config: { kind: 'cases' } },
      { type: 'member_entry', config: { mode: 'enrollment' } },
      { type: 'member_wallet', config: { mode: 'balances' } },
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
      {
        type: 'operating_channels',
        config: {
          channels: [
            { code: 'courses', label: '课程' },
            { code: 'events', label: '活动' },
            { code: 'membership', label: '会员' },
          ],
        },
      },
      { type: 'quick_actions', config: { capabilities: ['consult', 'trial'] } },
      { type: 'service_catalog', config: { presentation: 'courses' } },
      { type: 'content_feed', config: { kind: 'events' } },
      { type: 'store_info', config: { label: '校区信息' } },
      { type: 'member_entry', config: { mode: 'enrollment' } },
      { type: 'member_wallet', config: { mode: 'balances' } },
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
      {
        type: 'operating_channels',
        config: {
          channels: [
            { code: 'catalog', label: '选品' },
            { code: 'events', label: '活动' },
            { code: 'membership', label: '会员' },
          ],
        },
      },
      { type: 'quick_actions', config: { capabilities: ['consult', 'phone', 'navigation'] } },
      { type: 'service_catalog', config: { presentation: 'catalog' } },
      { type: 'banner_carousel', config: { limit: 3 } },
      { type: 'member_entry', config: { mode: 'enrollment' } },
      { type: 'member_wallet', config: { mode: 'balances' } },
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
  constructor(private readonly dataScopes: DataScopeService) {}

  private input(body: Record<string, unknown>) {
    const plan = String(body.plan ?? 'starter');
    if (!PLANS.has(plan)) throw new BadRequestException('VALIDATION_ERROR');
    const activationMode =
      body.activationMode === 'token' || body.activationMode === 'password'
        ? body.activationMode
        : body.adminPassword
          ? 'password'
          : 'token';
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
      adminPassword:
        activationMode === 'password' ? text(body.adminPassword, 128) : (optionalText(body.adminPassword, 128) ?? ''),
      industry: industryFrom(body),
      plan,
      themeVariant: optionalText(body.themeVariant, 48) ?? 'signature',
      sourceMode: body.sourceMode === 'channel_referral' ? 'channel_referral' : 'platform_direct',
      channelId: optionalText(body.channelId, 36),
      circleId: optionalText(body.circleId, 36),
      activationMode: activationMode as 'password' | 'token',
    };
    if (!/.+@.+\..+/.test(input.adminEmail)) throw new BadRequestException('VALIDATION_ERROR');
    if (input.activationMode === 'password' && input.adminPassword.length < 12)
      throw new BadRequestException('VALIDATION_ERROR');
    if (input.activationMode === 'token' && input.adminPassword)
      throw new BadRequestException('VALIDATION_ERROR');
    if (input.sourceMode === 'channel_referral') {
      if (!input.channelId || !/^[0-9a-f-]{36}$/i.test(input.channelId))
        throw new BadRequestException('VALIDATION_ERROR');
    } else {
      input.channelId = null;
    }
    if (input.circleId && !/^[0-9a-f-]{36}$/i.test(input.circleId))
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
    let checkpoint: Record<string, string> | null = null;
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
      checkpoint = await this.provisionFoundation(client, context, input, runId);
      await client.query(
        `update tenant_provisioning_runs
         set tenant_id=$2,
             input=coalesce(input,'{}'::jsonb)||$3::jsonb,
             updated_at=now(),
             updated_by=$4
         where id=$1`,
        [runId, checkpoint.tenantId, { checkpoint }, context.userId],
      );
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      const conflict =
        error instanceof ConflictException || (error as { code?: string }).code === '23505';
      const terminal = conflict || error instanceof BadRequestException;
      const detail =
        error instanceof Error ? error.message.slice(0, 1000) : 'Unknown provisioning failure';
      await this.pool.query(
        'update tenant_provisioning_runs set state=$2,error_code=$3,error_detail=$4,updated_at=now(),updated_by=$5 where id=$1',
        [
          runId,
          terminal ? 'failed_terminal' : 'failed_recoverable',
          terminal ? 'VALIDATION_OR_CONFLICT' : 'PROVISIONING_FAILED',
          detail,
          context.userId,
        ],
      );
      await this.persistFailedStepTrail(runId, context.userId, detail);
      if (conflict && !(error instanceof ConflictException))
        throw new ConflictException('CONFLICT');
      if (terminal) throw error;
      return this.get(context, runId);
    } finally {
      client.release();
    }

    return this.finishCommercialPhase(
      context,
      runId,
      correlationId,
      input,
      checkpoint!,
      typeof body.testFailAtStep === 'string' ? body.testFailAtStep : null,
    );
  }

  /**
   * W∞-128 — resume a failed_recoverable run whose foundation tenant already committed.
   * Replays commercial steps (industry_template → ready) without recreating identity/org/store.
   */
  async resume(context: OrganizationContext, runId: string, requestId: string, body: Record<string, unknown> = {}) {
    if (!/^[0-9a-f-]{36}$/i.test(runId)) throw new BadRequestException('VALIDATION_ERROR');
    const run = (
      await this.pool.query(
        `select id,tenant_id,state,input,correlation_id,industry,plan,source_mode,request_slug
         from tenant_provisioning_runs
         where id=$1 and requested_by_tenant_id=$2 and deleted_at is null`,
        [runId, context.tenantId],
      )
    ).rows[0] as
      | {
          id: string;
          tenant_id: string | null;
          state: string;
          input: Record<string, unknown>;
          correlation_id: string;
        }
      | undefined;
    if (!run) throw new NotFoundException('NOT_FOUND');
    if (run.state !== 'failed_recoverable' || !run.tenant_id)
      throw new ConflictException('CONFLICT');
    const checkpoint = (run.input?.checkpoint ?? null) as Record<string, string> | null;
    if (!checkpoint?.tenantId || checkpoint.tenantId !== run.tenant_id)
      throw new ConflictException('CONFLICT');

    const input = this.inputFromStored(run.input);
    const commercial = [
      'industry_template',
      'storefront_publish',
      'commercial_defaults',
      'channel_circle',
      'one_code_delivery',
      'activate_verify',
      'ready_handoff',
    ];
    await this.pool.query(
      `update tenant_provisioning_steps
       set state='pending', attempts=0, started_at=null, ended_at=null, error_code=null, output='{}'::jsonb,
           updated_at=now(), version=version+1
       where run_id=$1 and step_code=any($2::text[]) and deleted_at is null`,
      [runId, commercial],
    );
    await this.pool.query(
      `update tenant_provisioning_runs
       set state='provisioning', error_code=null, error_detail=null, updated_at=now(), updated_by=$2, version=version+1
       where id=$1`,
      [runId, context.userId],
    );
    const correlationId = /^[0-9a-f-]{36}$/i.test(requestId)
      ? requestId
      : (run.correlation_id ?? randomUUID());
    return this.finishCommercialPhase(
      context,
      runId,
      correlationId,
      input,
      checkpoint,
      typeof body.testFailAtStep === 'string' ? body.testFailAtStep : null,
    );
  }

  private inputFromStored(stored: Record<string, unknown>): Input {
    const { checkpoint: _checkpoint, ...rest } = stored;
    return this.input({
      ...rest,
      activationMode: rest.activationMode === 'token' ? 'token' : 'password',
      // Password mode resume needs a placeholder only for schema; owner already exists.
      adminPassword:
        rest.activationMode === 'token'
          ? undefined
          : typeof rest.adminPassword === 'string' && rest.adminPassword.length >= 12
            ? rest.adminPassword
            : 'Resume-Placeholder-Password!',
    });
  }

  private async finishCommercialPhase(
    context: OrganizationContext,
    runId: string,
    correlationId: string,
    input: Input,
    checkpoint: Record<string, string>,
    testFailAtStep: string | null,
  ) {
    const hooksEnabled =
      process.env.ONEDAY_PROVISIONING_TEST_HOOKS === '1' ||
      (process.env.DATABASE_URL ?? '').includes('oneday_v3_test');
    const failAt = hooksEnabled && testFailAtStep ? testFailAtStep : null;
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      if (failAt === 'industry_template') {
        const err = new Error('TEST_INJECTED_COMMERCIAL_FAILURE');
        (err as { failStep?: string }).failStep = 'industry_template';
        throw err;
      }
      const resources = await this.provisionCommercial(
        client,
        context,
        input,
        runId,
        correlationId,
        checkpoint,
      );
      const finalState = input.activationMode === 'token' ? 'awaiting_activation' : 'ready';
      await client.query(
        `update tenant_provisioning_runs
         set tenant_id=$2,state=$3,delivery=$4,verification=$5,
             ready_at=${finalState === 'ready' ? 'now()' : 'null'},
             error_code=null,error_detail=null,
             updated_at=now(),updated_by=$6,version=version+1
         where id=$1`,
        [
          runId,
          resources.tenantId,
          finalState,
          resources.delivery,
          resources.verification,
          context.userId,
        ],
      );
      await client.query('commit');
      return this.get(context, runId);
    } catch (error) {
      await client.query('rollback');
      const conflict =
        error instanceof ConflictException || (error as { code?: string }).code === '23505';
      const terminal = conflict || error instanceof BadRequestException;
      const detail =
        error instanceof Error ? error.message.slice(0, 1000) : 'Unknown provisioning failure';
      const failStep =
        typeof (error as { failStep?: string }).failStep === 'string'
          ? (error as { failStep: string }).failStep
          : 'industry_template';
      await this.pool.query(
        'update tenant_provisioning_runs set state=$2,error_code=$3,error_detail=$4,updated_at=now(),updated_by=$5,version=version+1 where id=$1',
        [
          runId,
          terminal ? 'failed_terminal' : 'failed_recoverable',
          terminal ? 'VALIDATION_OR_CONFLICT' : 'PROVISIONING_FAILED',
          detail,
          context.userId,
        ],
      );
      if (!terminal) {
        await this.pool.query(
          `update tenant_provisioning_steps
           set state='failed', attempts=attempts+1, started_at=coalesce(started_at,now()), ended_at=now(),
               error_code='PROVISIONING_FAILED', output=$3::jsonb, updated_at=now(), version=version+1
           where run_id=$1 and step_code=$2 and deleted_at is null`,
          [runId, failStep, { detail, resumable: true }],
        );
        await this.pool.query(
          "insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,'platform.tenant_provisioning_failed_recoverable','tenant_provisioning_run',$4,$5,'commercial-provisioning',$6,$3,$3)",
          [
            randomUUID(),
            context.tenantId,
            context.userId,
            runId,
            correlationId,
            { runId, failStep, detail, tenantId: checkpoint.tenantId },
          ],
        );
      }
      if (conflict && !(error instanceof ConflictException))
        throw new ConflictException('CONFLICT');
      if (terminal) throw error;
      return this.get(context, runId);
    } finally {
      client.release();
    }
  }

  /** After a rolled-back foundation TX, re-materialize step rows so operators can see the failure trail. */
  private async persistFailedStepTrail(runId: string, userId: string, detail: string) {
    const existing = await this.pool.query(
      'select 1 from tenant_provisioning_steps where run_id=$1 and deleted_at is null limit 1',
      [runId],
    );
    if (existing.rowCount) return;
    for (const [position, code] of STEP_CODES.entries()) {
      const failed = position === 0;
      await this.pool.query(
        'insert into tenant_provisioning_steps(id,run_id,step_code,position,state,attempts,started_at,ended_at,error_code,output,created_by,updated_by) values($1,$2,$3,$4,$5,$6,now(),now(),$7,$8,$9,$9)',
        [
          randomUUID(),
          runId,
          code,
          position,
          failed ? 'failed' : 'pending',
          failed ? 1 : 0,
          failed ? 'PROVISIONING_FAILED' : null,
          failed ? { detail } : null,
          userId,
        ],
      );
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

  private async provisionFoundation(
    client: PoolClient,
    context: OrganizationContext,
    input: Input,
    runId: string,
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
      draftVersionId: randomUUID(),
      bindingId: randomUUID(),
      previewTokenId: randomUUID(),
      actionId: randomUUID(),
      serviceId: randomUUID(),
      benefitId: randomUUID(),
      contentId: randomUUID(),
      ownerCodeEntryId: randomUUID(),
      activationTokenId: randomUUID(),
    };
    try {
      await client.query(
        'insert into tenants(id,slug,name,created_by,updated_by) values($1,$2,$3,$4,$4)',
        [ids.tenantId, input.slug, input.tenantName, context.userId],
      );
    } catch (error) {
      if ((error as { code?: string }).code === '23505') throw new ConflictException('CONFLICT');
      throw error;
    }
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

    try {
      if (input.activationMode === 'token') {
        await client.query(
          "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) values($1,$2,$3,null,'pending',$4,$4)",
          [ids.userId, input.adminEmail, input.adminName, context.userId],
        );
      } else {
        await client.query(
          "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) values($1,$2,$3,$4,'active',$5,$5)",
          [
            ids.userId,
            input.adminEmail,
            input.adminName,
            `scrypt$oneday-onboarding$${scryptSync(input.adminPassword, 'oneday-onboarding', 64).toString('base64url')}`,
            context.userId,
          ],
        );
      }
    } catch (error) {
      if ((error as { code?: string }).code === '23505') throw new ConflictException('CONFLICT');
      throw error;
    }
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
      activationMode: input.activationMode,
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
    await this.dataScopes.syncStoreAssignment(client, {
      tenantId: ids.tenantId,
      storeId: ids.storeId,
      employeeId: ids.employeeId,
      actorId: context.userId,
    });
    await this.completeStep(client, runId, 'organization_store', {
      organizationId: ids.orgId,
      merchantId: ids.merchantId,
      storeId: ids.storeId,
    });
    return ids;
  }

  private async provisionCommercial(
    client: PoolClient,
    context: OrganizationContext,
    input: Input,
    runId: string,
    correlationId: string,
    ids: Record<string, string>,
  ) {
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
      publishedVersionId: ids.templateVersionId,
      family: input.industry,
      modules: catalog.modules.length,
    });

    await client.query(
      'update page_templates set published_version_id=$1,version=version+1,updated_at=now(),updated_by=$2 where id=$3',
      [ids.templateVersionId, context.userId, ids.templateId],
    );
    // Draft version is distinct from published live so Preview vs Published URLs differ (SPEC §7/§9).
    await client.query(
      "insert into page_template_versions(id,tenant_id,template_id,sequence,status,created_by,updated_by) values($1,$2,$3,2,'draft',$4,$4)",
      [ids.draftVersionId, ids.tenantId, ids.templateId, context.userId],
    );
    for (const [position, module] of catalog.modules.entries()) {
      await client.query(
        'insert into page_modules(id,tenant_id,template_version_id,module_type,position,config,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$7)',
        [
          randomUUID(),
          ids.tenantId,
          ids.draftVersionId,
          module.type,
          position,
          module.config,
          context.userId,
        ],
      );
    }
    await client.query(
      "insert into storefront_bindings(id,tenant_id,store_id,template_id,draft_version_id,live_version_id,status,published_at,created_by,updated_by) values($1,$2,$3,$4,$5,$6,'active',now(),$7,$7)",
      [
        ids.bindingId,
        ids.tenantId,
        ids.storeId,
        ids.templateId,
        ids.draftVersionId,
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
    const previewToken = randomBytes(24).toString('base64url');
    await client.query(
      "insert into storefront_preview_tokens(id,tenant_id,store_id,template_version_id,token_hash,expires_at,status,created_by,updated_by) values($1,$2,$3,$4,$5,now()+interval '30 minutes','active',$6,$6)",
      [
        ids.previewTokenId,
        ids.tenantId,
        ids.storeId,
        ids.draftVersionId,
        hashToken(previewToken),
        context.userId,
      ],
    );
    const bindingRow = (
      await client.query(
        'select version from storefront_bindings where id=$1',
        [ids.bindingId],
      )
    ).rows[0] as { version: number };
    const authEpochRow = (
      await client.query('select auth_epoch from tenants where id=$1', [ids.tenantId])
    ).rows[0] as { auth_epoch: number };
    const cache = await warmStorefrontReadModelCache(client, {
      tenantId: ids.tenantId!,
      storeId: ids.storeId!,
      bindingId: ids.bindingId!,
      liveVersionId: ids.templateVersionId!,
      bindingVersion: Number(bindingRow.version),
      authEpoch: Number(authEpochRow?.auth_epoch ?? 0),
      correlationId,
      actorId: context.userId,
    });
    const storefrontCache = {
      previewToken,
      publishedVersion: cache.publishedVersion,
      etag: cache.etag,
      cacheVersion: cache.cacheVersion,
      publishedPath: `/c/stores/${ids.storeId}?tenant=${encodeURIComponent(input.slug)}`,
      previewPath: `/c/stores/${ids.storeId}?tenant=${encodeURIComponent(input.slug)}&preview=${encodeURIComponent(previewToken)}&scene=storefront_preview`,
      liveVersionId: ids.templateVersionId!,
      draftVersionId: ids.draftVersionId!,
    };
    await this.completeStep(client, runId, 'storefront_publish', {
      bindingId: ids.bindingId,
      liveVersionId: ids.templateVersionId,
      draftVersionId: ids.draftVersionId,
      publishedVersion: storefrontCache.publishedVersion,
      etag: storefrontCache.etag,
      cacheVersion: storefrontCache.cacheVersion,
      previewPath: storefrontCache.previewPath,
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
      "insert into content_items(id,tenant_id,kind,title,body,status,created_by,updated_by) values($1,$2,'article',$3,$4,'approved',$5,$5)",
      [ids.contentId, ids.tenantId, catalog.content.title, catalog.content.summary, context.userId],
    );
    await client.query(
      'insert into content_store_placements(id,tenant_id,content_id,store_id,rank,created_by,updated_by) values($1,$2,$3,$4,100,$5,$5)',
      [randomUUID(), ids.tenantId, ids.contentId, ids.storeId, context.userId],
    );
    await this.completeStep(client, runId, 'commercial_defaults', {
      serviceId: ids.serviceId,
      benefitId: ids.benefitId,
      contentId: ids.contentId,
      memberPolicy: 'consent_required',
      employeeWorkspace: 'owner_store_manager',
    });

    let channelCircleOutput: Record<string, unknown> = {
      sourceMode: input.sourceMode,
      circleExposure: 'not_requested',
    };
    let channelCircleState: 'succeeded' | 'skipped' = 'skipped';
    if (input.sourceMode === 'channel_referral' && input.channelId) {
      const channel = (
        await client.query(
          "select id,code,name from platform_channels where id=$1 and tenant_id=$2 and status='active' and deleted_at is null",
          [input.channelId, context.tenantId],
        )
      ).rows[0];
      if (!channel) throw new BadRequestException('CHANNEL_NOT_AVAILABLE');
      await client.query(
        "insert into platform_channel_merchants(id,tenant_id,channel_id,merchant_tenant_id,onboarding_status,service_status,created_by,updated_by) values($1,$2,$3,$4,'onboarding','pending',$5,$5)",
        [randomUUID(), context.tenantId, channel.id, ids.tenantId, context.userId],
      );
      channelCircleOutput = {
        sourceMode: input.sourceMode,
        channelId: channel.id,
        channelCode: channel.code,
        circleExposure: 'not_requested',
        membership: 'written',
      };
      channelCircleState = 'succeeded';
    }
    if (input.circleId) {
      const circle = (
        await client.query(
          "select id,code,name from platform_business_circles where id=$1 and tenant_id=$2 and status='active' and deleted_at is null",
          [input.circleId, context.tenantId],
        )
      ).rows[0];
      if (!circle) throw new BadRequestException('CIRCLE_NOT_AVAILABLE');
      const membershipId = randomUUID();
      try {
        await client.query(
          `insert into platform_business_circle_merchants(
             id,tenant_id,circle_id,merchant_tenant_id,benefits,recommendation_reason,
             invitation_status,invitation_note,circle_approval_status,approval_status,display_config,
             created_by,updated_by
           ) values(
             $1,$2,$3,$4,'[]'::jsonb,$5,
             'accepted','provisioning circle request','pending','pending',$6::jsonb,
             $7,$7
           )`,
          [
            membershipId,
            context.tenantId,
            circle.id,
            ids.tenantId,
            `开通申请加入商圈 ${circle.name}`,
            JSON.stringify({ visible: false, sortOrder: 0, source: 'provisioning' }),
            context.userId,
          ],
        );
      } catch (error) {
        if ((error as { code?: string }).code === '23505') throw new ConflictException('CONFLICT');
        throw error;
      }
      channelCircleOutput = {
        ...channelCircleOutput,
        circleId: circle.id,
        circleCode: circle.code,
        circleMembershipId: membershipId,
        circleExposure: 'pending',
        dualApproval: false,
        consumerVisible: false,
      };
      channelCircleState = 'succeeded';
      ids.circleMembershipId = membershipId;
      ids.circleId = circle.id;
    }
    await this.completeStep(client, runId, 'channel_circle', channelCircleOutput, channelCircleState);

    const mintCode = () => randomUUID().replaceAll('-', '').slice(0, 20).toUpperCase();
    const consumerCode = mintCode();
    const ownerCode = mintCode();
    const employeeCode = mintCode();
    const activationToken =
      input.activationMode === 'token' ? mintActivationToken() : null;
    const consumerPath = `/c/entry?tenant=${encodeURIComponent(input.slug)}&source=one-code:${consumerCode}&scene=storefront`;
    const ownerPath =
      input.activationMode === 'token'
        ? `/owner-activate?code=${encodeURIComponent(ownerCode)}`
        : '/m';
    const employeePath = '/e/workbench';
    const sceneRows: {
      scene: 'consumer_storefront' | 'owner_activation' | 'employee_onboarding';
      code: string;
      entryId: string;
      targetPath: string;
      roleTargets: Record<string, string>;
      resolveRole: 'consumer' | 'management' | 'employee';
    }[] = [
      {
        scene: 'consumer_storefront',
        code: consumerCode,
        entryId: randomUUID(),
        targetPath: consumerPath,
        roleTargets: { consumer: consumerPath, employee: employeePath, management: '/m' },
        resolveRole: 'consumer',
      },
      {
        scene: 'owner_activation',
        code: ownerCode,
        entryId: ids.ownerCodeEntryId ?? randomUUID(),
        targetPath: ownerPath,
        roleTargets: { management: ownerPath },
        resolveRole: 'management',
      },
      {
        scene: 'employee_onboarding',
        code: employeeCode,
        entryId: randomUUID(),
        targetPath: employeePath,
        roleTargets: { employee: employeePath },
        resolveRole: 'employee',
      },
    ];
    for (const row of sceneRows) {
      await client.query(
        "insert into one_code_entries(id,tenant_id,store_id,code,scene,source,target_path,role_targets,created_by,updated_by) values($1,$2,$3,$4,$5,'provisioning',$6,$7,$8,$8)",
        [
          row.entryId,
          ids.tenantId,
          ids.storeId,
          row.code,
          row.scene,
          row.targetPath,
          row.roleTargets,
          context.userId,
        ],
      );
    }
    let activationMeta: Record<string, unknown> | null = null;
    if (activationToken) {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await client.query(
        "insert into owner_activation_tokens(id,tenant_id,run_id,user_id,one_code_entry_id,token_hash,status,expires_at,created_by,updated_by) values($1,$2,$3,$4,$5,$6,'pending',$7,$8,$8)",
        [
          ids.activationTokenId,
          ids.tenantId,
          runId,
          ids.userId,
          ids.ownerCodeEntryId,
          hashToken(activationToken),
          expiresAt,
          context.userId,
        ],
      );
      activationMeta = {
        mode: 'token',
        token: activationToken,
        expiresAt: expiresAt.toISOString(),
        activatePath: '/api/v1/auth/owner-activate',
        ownerCode,
      };
    } else {
      activationMeta = { mode: 'password', ownerActivated: true };
    }
    const scenes = sceneRows.map((row) => ({
      scene: row.scene,
      code: row.code,
      status: 'active' as const,
      resolveRole: row.resolveRole,
      resolvePath: `/api/v1/one-code/${row.code}${row.resolveRole === 'consumer' ? '' : `?role=${row.resolveRole}`}`,
      landingPath: `/c/one-code/${row.code}`,
      targetPath: row.targetPath,
    }));
    const delivery = {
      oneCode: consumerCode,
      resolvePath: `/api/v1/one-code/${consumerCode}`,
      landingPath: `/c/one-code/${consumerCode}`,
      consumerPath,
      ownerEmail: input.adminEmail,
      managementPath: '/m',
      employeePath,
      scenes,
      activation: activationMeta,
      circle: {
        exposure: (channelCircleOutput.circleExposure as string) ?? 'not_requested',
        circleId: (channelCircleOutput.circleId as string | undefined) ?? null,
        circleCode: (channelCircleOutput.circleCode as string | undefined) ?? null,
        membershipId: (channelCircleOutput.circleMembershipId as string | undefined) ?? null,
        dualApproval: Boolean(channelCircleOutput.dualApproval),
        consumerVisible: Boolean(channelCircleOutput.consumerVisible),
      },
      storefront: {
        publishedPath: storefrontCache.publishedPath,
        previewPath: storefrontCache.previewPath,
        liveVersionId: storefrontCache.liveVersionId,
        draftVersionId: storefrontCache.draftVersionId,
        publishedVersion: storefrontCache.publishedVersion,
        etag: storefrontCache.etag,
        cacheVersion: storefrontCache.cacheVersion,
      },
    };
    await this.completeStep(client, runId, 'one_code_delivery', delivery);

    const verification = await this.verify(
      client,
      context.tenantId,
      ids,
      input,
      correlationId,
      {
        requireOwnerActivated: input.activationMode === 'password',
      },
    );
    const requiredOk = Object.entries(verification)
      .filter(([key]) => key !== 'owner_activated' || input.activationMode === 'password')
      .every(([, value]) => Boolean(value));
    if (!requiredOk) throw new Error('READY_VERIFICATION_FAILED');
    await this.completeStep(client, runId, 'activate_verify', {
      ...verification,
      activationMode: input.activationMode,
      awaitingActivation: input.activationMode === 'token',
    });
    if (input.activationMode === 'token') {
      // ready_handoff stays pending until owner activates.
      await client.query(
        "update tenant_provisioning_steps set state='pending',output=$3,updated_at=now(),version=version+1 where run_id=$1 and step_code=$2",
        [
          runId,
          'ready_handoff',
          { ready: false, awaitingActivation: true, tenantId: ids.tenantId, storeId: ids.storeId },
        ],
      );
      await client.query(
        "insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,'platform.tenant_awaiting_activation','tenant_provisioning_run',$4,$5,'commercial-provisioning',$6,$3,$3)",
        [
          randomUUID(),
          context.tenantId,
          context.userId,
          runId,
          correlationId,
          { runId, tenantId: ids.tenantId, ownerEmail: input.adminEmail },
        ],
      );
      await client.query(
        "insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,'tenant.provisioning.awaiting_activation.v1','tenant_provisioning_run',$3,$4,$5,'commercial-provisioning',$6,$6)",
        [
          randomUUID(),
          context.tenantId,
          runId,
          { runId, tenantId: ids.tenantId },
          correlationId,
          context.userId,
        ],
      );
    } else {
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
    }
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
      [roles.owner]: (code) =>
        !code.startsWith('platform.') && !code.startsWith('channel.') && code !== 'circle.manage',
      [roles.storeManager]: (code) =>
        !code.startsWith('platform.') &&
        !code.startsWith('channel.') &&
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

  private async verify(
    client: PoolClient,
    _platformTenantId: string,
    ids: Record<string, string>,
    input: Input,
    correlationId: string,
    opts: { requireOwnerActivated: boolean } = { requireOwnerActivated: true },
  ) {
    await this.ensureWorkerHeartbeatForVerify();
    const stalePendingMinutes = 15;
    const workerFreshMinutes = 5;
    const row = (
      await client.query(
        `select
          exists(select 1 from tenants where id=$1 and slug=$2 and status='active' and deleted_at is null) tenant_active,
          exists(select 1 from platform_tenant_settings where tenant_id=$1 and plan=$3 and deleted_at is null) plan_ready,
          exists(select 1 from memberships m join membership_roles mr on mr.membership_id=m.id and mr.tenant_id=m.tenant_id join roles r on r.id=mr.role_id and r.tenant_id=m.tenant_id where m.id=$4 and m.tenant_id=$1 and m.status='active' and r.code='owner') owner_ready,
          exists(select 1 from users where id=$11 and status='active' and password_hash is not null and deleted_at is null) owner_activated,
          exists(select 1 from employees where id=$5 and tenant_id=$1 and status='active' and deleted_at is null) employee_ready,
          exists(select 1 from stores where id=$6 and tenant_id=$1 and status='active' and address is not null and phone is not null and business_hours is not null and deleted_at is null) store_ready,
          exists(select 1 from storefront_bindings where id=$7 and tenant_id=$1 and live_version_id=$8 and status='active' and deleted_at is null) storefront_published,
          exists(select 1 from page_templates where id=$9 and tenant_id=$1 and published_version_id=$8 and status='active' and deleted_at is null) template_published,
          exists(
            select 1 from storefront_bindings sb
            join page_templates pt on pt.id=sb.template_id and pt.tenant_id=sb.tenant_id and pt.published_version_id=sb.live_version_id
            where sb.id=$7 and sb.tenant_id=$1 and sb.live_version_id=$8 and sb.status='active' and sb.deleted_at is null
              and exists(
                select 1 from page_modules pm
                where pm.tenant_id=sb.tenant_id and pm.template_version_id=sb.live_version_id
                  and pm.status='active' and pm.deleted_at is null
              )
          ) published_read_consistent,
          exists(
            select 1 from storefront_bindings sb
            join storefront_preview_tokens spt
              on spt.tenant_id=sb.tenant_id and spt.store_id=sb.store_id
             and spt.template_version_id=sb.draft_version_id
             and spt.status='active' and spt.deleted_at is null and spt.expires_at>now()
            where sb.id=$7 and sb.tenant_id=$1 and sb.live_version_id=$8
              and sb.draft_version_id is not null and sb.draft_version_id <> sb.live_version_id
              and sb.status='active' and sb.deleted_at is null
          ) preview_published_distinguishable,
          exists(
            select 1 from storefront_read_model_cache c
            join storefront_bindings sb on sb.id=c.binding_id and sb.tenant_id=c.tenant_id and sb.store_id=c.store_id
            join tenants t on t.id=c.tenant_id
            where c.tenant_id=$1 and c.store_id=$6 and c.binding_id=$7 and c.live_version_id=$8
              and c.deleted_at is null and sb.deleted_at is null
              and c.published_version = (sb.id::text || ':' || sb.version::text || ':' || coalesce(sb.live_version_id::text,'none'))
              and c.binding_version = sb.version
              and c.auth_epoch = t.auth_epoch
          ) cache_version_consistent,
          exists(select 1 from one_code_entries where tenant_id=$1 and store_id=$6 and scene='consumer_storefront' and status='active' and deleted_at is null) consumer_qr_ready,
          exists(select 1 from one_code_entries where tenant_id=$1 and store_id=$6 and scene='owner_activation' and status='active' and deleted_at is null) owner_qr_ready,
          exists(select 1 from one_code_entries where tenant_id=$1 and store_id=$6 and scene='employee_onboarding' and status='active' and deleted_at is null) employee_qr_ready,
          (
            select count(*)::int from one_code_entries
            where tenant_id=$1 and store_id=$6 and status='active' and deleted_at is null
              and scene in ('consumer_storefront','owner_activation','employee_onboarding')
          ) = 3 one_code_ready,
          not exists(
            select 1 from outbox_events
            where deleted_at is null
              and (tenant_id=$1 or correlation_id=$10)
              and (
                last_error is not null
                or status='needs_attention'
                or (status='pending' and available_at < now() - make_interval(mins => $12))
              )
          ) outbox_clear,
          exists(
            select 1 from worker_heartbeats
            where service_name='oneday-worker'
              and status='ok'
              and deleted_at is null
              and last_run_at > now() - make_interval(mins => $13)
          ) worker_health_recent,
          not exists(
            select 1 from platform_business_circle_merchants m
            where m.merchant_tenant_id=$1
              and m.deleted_at is null
              and m.invitation_status='accepted'
              and m.circle_approval_status='approved'
              and m.approval_status='approved'
              and coalesce((m.display_config->>'visible')::boolean,false)
          ) circle_not_consumer_visible`,
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
          correlationId,
          ids.userId,
          stalePendingMinutes,
          workerFreshMinutes,
        ],
      )
    ).rows[0] as Record<string, boolean>;
    void opts;
    return row;
  }

  /**
   * Seed a fresh worker heartbeat outside the commercial TX when test hooks are on,
   * so a later rollback cannot erase the READY precondition.
   */
  private async ensureWorkerHeartbeatForVerify() {
    const hooksEnabled =
      process.env.ONEDAY_PROVISIONING_TEST_HOOKS === '1' ||
      (process.env.DATABASE_URL ?? '').includes('oneday_v3_test');
    if (!hooksEnabled) return;
    const recent = await this.pool.query(
      `select 1 from worker_heartbeats
       where service_name='oneday-worker' and status='ok' and deleted_at is null
         and last_run_at > now() - interval '5 minutes'
       limit 1`,
    );
    if (recent.rowCount) return;
    await this.pool.query(
      `insert into worker_heartbeats(id,service_name,status,last_run_at,last_error,payload,created_by,updated_by)
       values($1,'oneday-worker','ok',now(),null,$2::jsonb,null,null)
       on conflict (service_name) do update
       set status='ok', last_run_at=now(), last_error=null, payload=excluded.payload,
           updated_at=now(), deleted_at=null, version=worker_heartbeats.version+1`,
      [randomUUID(), JSON.stringify({ source: 'provisioning-test-hooks' })],
    );
  }

  async revokeDeliveryScene(
    context: OrganizationContext,
    runId: string,
    scene: string,
    requestId: string,
  ) {
    const allowed = new Set([
      'consumer_storefront',
      'owner_activation',
      'employee_onboarding',
    ]);
    if (!allowed.has(scene)) throw new BadRequestException('VALIDATION_ERROR');
    const run = (
      await this.pool.query(
        "select id,tenant_id,delivery,correlation_id from tenant_provisioning_runs where id=$1 and requested_by_tenant_id=$2 and state='ready' and deleted_at is null",
        [runId, context.tenantId],
      )
    ).rows[0] as
      | {
          id: string;
          tenant_id: string;
          delivery: Record<string, unknown> | null;
          correlation_id: string;
        }
      | undefined;
    if (!run?.tenant_id) throw new NotFoundException('NOT_FOUND');
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const entry = (
        await client.query(
          "select id,code from one_code_entries where tenant_id=$1 and scene=$2 and status='active' and deleted_at is null for update",
          [run.tenant_id, scene],
        )
      ).rows[0] as { id: string; code: string } | undefined;
      if (!entry) throw new NotFoundException('NOT_FOUND');
      await client.query(
        "update one_code_entries set status='revoked',updated_at=now(),updated_by=$2,version=version+1 where id=$1",
        [entry.id, context.userId],
      );
      const delivery = (run.delivery ?? {}) as {
        scenes?: { scene: string; status?: string; code?: string }[];
        [key: string]: unknown;
      };
      const scenes = Array.isArray(delivery.scenes)
        ? delivery.scenes.map((item) =>
            item.scene === scene ? { ...item, status: 'revoked' } : item,
          )
        : [];
      const nextDelivery = { ...delivery, scenes };
      await client.query(
        'update tenant_provisioning_runs set delivery=$2,updated_at=now(),updated_by=$3,version=version+1 where id=$1',
        [runId, nextDelivery, context.userId],
      );
      const correlationId = /^[0-9a-f-]{36}$/i.test(requestId)
        ? requestId
        : (run.correlation_id ?? randomUUID());
      const detail = { runId, scene, code: entry.code, status: 'revoked' };
      await client.query(
        "insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,'platform.delivery_scene_revoked','tenant_provisioning_run',$4,$5,'commercial-provisioning',$6,$3,$3)",
        [randomUUID(), context.tenantId, context.userId, runId, correlationId, detail],
      );
      await client.query(
        "insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,'tenant.provisioning.delivery_revoked.v1','tenant_provisioning_run',$3,$4,$5,'commercial-provisioning',$6,$6)",
        [randomUUID(), context.tenantId, runId, detail, correlationId, context.userId],
      );
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
    return this.get(context, runId);
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
      channelId: input.channelId,
      circleId: input.circleId,
      activationMode: input.activationMode,
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
