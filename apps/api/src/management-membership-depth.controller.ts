import { BadRequestException, Body, Controller, Get, Headers, Post, Query } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { ManagementMembershipDepthService } from './management-membership-depth.service';

@Controller('api/v1/management/memberships')
export class ManagementMembershipDepthController {
  constructor(
    private readonly auth: AuthorizationService,
    private readonly depth: ManagementMembershipDepthService,
  ) {}

  private async context(
    authorization: string | undefined,
    tenant: string | undefined,
    request: string | undefined,
  ) {
    if (!request?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return this.auth.require(authorization, 'tenant.manage', tenant);
  }

  @Get('rules')
  async listRules(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
  ) {
    const c = await this.context(a, t, r);
    return { data: await this.depth.rules(c), meta: { requestId: r }, error: null };
  }

  @Post('rules')
  async upsertRule(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Headers('idempotency-key') k: string | undefined,
    @Body() b: Record<string, unknown>,
  ) {
    const c = await this.context(a, t, r);
    return {
      data: await this.depth.upsertRule(c, b, k ?? '', r!),
      meta: { requestId: r },
      error: null,
    };
  }

  @Get('renewals')
  async renewals(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
  ) {
    const c = await this.context(a, t, r);
    return { data: await this.depth.renewals(c), meta: { requestId: r }, error: null };
  }

  @Get('alerts')
  async alerts(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
  ) {
    const c = await this.context(a, t, r);
    return { data: await this.depth.alerts(c), meta: { requestId: r }, error: null };
  }

  /** G1-W∞-135 — 会员入会月 cohort（§2 densify）。 */
  @Get('cohort')
  async cohort(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Query('months') months?: string,
  ) {
    const c = await this.context(a, t, r);
    const monthsNum = months === undefined || months === '' ? 6 : Number(months);
    return {
      data: await this.depth.cohort(c, monthsNum),
      meta: { requestId: r },
      error: null,
    };
  }

  /** G1-W∞-137 — 会员等级分布：等级→在册/仍有效/临期/已过期（§2 densify）。 */
  @Get('tiers')
  async tiers(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
  ) {
    const c = await this.context(a, t, r);
    return { data: await this.depth.tiers(c), meta: { requestId: r }, error: null };
  }

  /** G1-W∞-137 — 批量到期策略：为选中在册会员批量延后/设置有效期（§2 densify）。 */
  @Post('batch-expiry')
  async batchExpiry(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Headers('idempotency-key') k: string | undefined,
    @Body() b: Record<string, unknown>,
  ) {
    const c = await this.context(a, t, r);
    return {
      data: await this.depth.batchExpiry(c, b, k ?? '', null),
      meta: { requestId: r },
      error: null,
    };
  }
}
