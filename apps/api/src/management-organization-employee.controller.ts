import { BadRequestException, Controller, Get, Headers } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { ManagementOrganizationEmployeeService } from './management-organization-employee.service';

@Controller('api/v1/management/organization-employees')
export class ManagementOrganizationEmployeeController {
  constructor(
    private readonly auth: AuthorizationService,
    private readonly overview: ManagementOrganizationEmployeeService,
  ) {}
  @Get()
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.overview.overview(
        await this.auth.require(authorization, 'tenant.manage', tenant),
      ),
      meta: { requestId },
      error: null,
    };
  }
}
