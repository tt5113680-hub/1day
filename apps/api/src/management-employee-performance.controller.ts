import { BadRequestException, Controller, Get, Headers } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { ManagementEmployeePerformanceService } from './management-employee-performance.service';

@Controller('api/v1/management/employee-process-performance')
export class ManagementEmployeePerformanceController {
  constructor(
    private readonly auth: AuthorizationService,
    private readonly performance: ManagementEmployeePerformanceService,
  ) {}
  @Get() async overview(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.performance.overview(
        await this.auth.require(authorization, 'tenant.manage', tenant),
      ),
      meta: { requestId },
      error: null,
    };
  }
}
