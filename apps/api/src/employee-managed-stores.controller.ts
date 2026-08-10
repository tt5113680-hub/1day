import { BadRequestException, Controller, Get, Headers, Param } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { DataScopeService } from './data-scope.service';

@Controller('api/v1/employee')
export class EmployeeManagedStoresController {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly dataScopes: DataScopeService,
  ) {}

  @Get('managed-stores')
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const context = await this.authorization.require(authorization, 'task.read', tenant);
    return {
      data: await this.dataScopes.managedStores(context.tenantId, context.userId),
      meta: { requestId },
      error: null,
    };
  }

  @Get('managed-stores/:storeId/access')
  async access(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Param('storeId') storeId: string,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const context = await this.authorization.require(authorization, 'task.read', tenant);
    const permissionCodes = await this.dataScopes.permissionCodes(
      context.tenantId,
      context.userId,
    );
    await this.dataScopes.requireStoreAccess(
      context.tenantId,
      context.userId,
      storeId,
      permissionCodes,
    );
    return {
      data: { storeId, allowed: true },
      meta: { requestId },
      error: null,
    };
  }
}
