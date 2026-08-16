import { BadRequestException, Body, Controller, Get, Headers, Post, Query } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { ManagementCrmDepthService } from './management-crm-depth.service';

@Controller('api/v1/management/customers')
export class ManagementCrmDepthController {
  constructor(
    private readonly auth: AuthorizationService,
    private readonly crm: ManagementCrmDepthService,
  ) {}

  private async context(
    authorization: string | undefined,
    tenant: string | undefined,
    request: string | undefined,
  ) {
    if (!request?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return this.auth.require(authorization, 'tenant.manage', tenant);
  }

  @Post('rfm/compute')
  async computeRfm(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
  ) {
    const c = await this.context(a, t, r);
    return { data: await this.crm.computeRfm(c, r!), meta: { requestId: r }, error: null };
  }

  @Post('tags/batch')
  async batchTag(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Headers('idempotency-key') k: string | undefined,
    @Body() b: Record<string, unknown>,
  ) {
    const c = await this.context(a, t, r);
    return {
      data: await this.crm.batchTag(c, b, k ?? '', r!),
      meta: { requestId: r },
      error: null,
    };
  }

  /** W∞-132 — §2 CRM：cohort + 复购周期 + 沉睡唤醒队列（只读聚合）。 */
  @Get('retention-depth')
  async retentionDepth(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Query('months') months: string | undefined,
  ) {
    const c = await this.context(a, t, r);
    return {
      data: await this.crm.retentionDepth(c, months),
      meta: { requestId: r },
      error: null,
    };
  }

  /** W∞-132 — 沉睡/需唤醒客户一键进入唤醒计划（打标 + 审计）。 */
  @Post('dormant-queue/wake')
  async wakeDormant(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Headers('idempotency-key') k: string | undefined,
    @Body() b: Record<string, unknown>,
  ) {
    const c = await this.context(a, t, r);
    return {
      data: await this.crm.wakeDormant(c, b, k ?? '', r!),
      meta: { requestId: r },
      error: null,
    };
  }
}
