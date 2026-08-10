import { BadRequestException, Controller, Get, Headers } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { ManagementRolePermissionService } from './management-role-permission.service';
@Controller('api/v1/management/roles-permissions')
export class ManagementRolePermissionController {
  constructor(
    private readonly auth: AuthorizationService,
    private readonly roles: ManagementRolePermissionService,
  ) {}
  @Get() async overview(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.roles.overview(
        await this.auth.requireAll(authorization, ['tenant.manage', 'organization.manage'], tenant),
      ),
      meta: { requestId },
      error: null,
    };
  }
}
