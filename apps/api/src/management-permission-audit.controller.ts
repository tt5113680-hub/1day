import { BadRequestException, Controller, Get, Headers, Query } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { ManagementPermissionAuditService } from './management-permission-audit.service';

@Controller('api/v1/management/permission-audit')
export class ManagementPermissionAuditController {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly audit: ManagementPermissionAuditService,
  ) {}

  @Get()
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Query('filter') filter: string | undefined,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const context = await this.authorization.require(authorization, 'tenant.manage', tenant);
    return {
      data: await this.audit.list(context, filter),
      meta: { requestId },
      error: null,
    };
  }
}
