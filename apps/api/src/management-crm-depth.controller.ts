import { BadRequestException, Body, Controller, Headers, Post } from '@nestjs/common';
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
}
