import { BadRequestException, Controller, Get, Headers } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { TenantQuotaService } from './tenant-quota.service';

@Controller('api/v1/management/quota')
export class ManagementQuotaController {
  constructor(
    private readonly auth: AuthorizationService,
    private readonly quotas: TenantQuotaService,
  ) {}

  @Get('status')
  async status(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.quotas.status(
        await this.auth.require(authorization, 'tenant.manage', tenant),
      ),
      meta: { requestId },
      error: null,
    };
  }
}
