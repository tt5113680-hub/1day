import { BadRequestException, Controller, Get, Headers } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { ManagementDashboardService } from './management-dashboard.service';
@Controller('api/v1/management/dashboard')
export class ManagementDashboardController {
  constructor(
    private readonly auth: AuthorizationService,
    private readonly dashboard: ManagementDashboardService,
  ) {}
  @Get() async overview(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
  ) {
    if (!r?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.dashboard.overview(await this.auth.require(a, 'tenant.manage', t)),
      meta: { requestId: r },
      error: null,
    };
  }
}
