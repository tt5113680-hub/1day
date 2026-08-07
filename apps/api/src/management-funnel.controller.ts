import { BadRequestException, Controller, Get, Headers, Param } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { ManagementFunnelService } from './management-funnel.service';

@Controller('api/v1/management/funnels')
export class ManagementFunnelController {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly funnels: ManagementFunnelService,
  ) {}

  @Get(':id')
  async detail(
    @Param('id') id: string,
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenantId: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.funnels.detail(
        await this.authorization.require(authorization, 'tenant.manage', tenantId),
        id,
      ),
      meta: { requestId },
      error: null,
    };
  }
}
