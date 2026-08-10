import { BadRequestException, Controller, Get, Headers, Param } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { DataScopeService } from './data-scope.service';
import { createApiPool } from './database-pool';
import { TenantContextService } from './tenant-context.service';

@Controller('api/v1/employee')
export class EmployeeManagedStoresController {
  private readonly pool = createApiPool();

  constructor(
    private readonly authorization: AuthorizationService,
    private readonly tenantContext: TenantContextService,
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
    const context = await this.tenantContext.fromAuthorization(authorization, tenant);
    const permissions = await this.pool.query<{ code: string }>(
      `select distinct p.code
       from memberships m
       join membership_roles mr on mr.membership_id=m.id and mr.tenant_id=m.tenant_id
       join role_permissions rp on rp.role_id=mr.role_id and rp.tenant_id=m.tenant_id and rp.status='active'
       join permissions p on p.id=rp.permission_id and p.status='active'
       where m.user_id=$1 and m.tenant_id=$2 and m.status='active'`,
      [context.userId, context.tenantId],
    );
    await this.authorization.require(authorization, 'task.read', tenant);
    await this.dataScopes.requireStoreAccess(
      context.tenantId,
      context.userId,
      storeId,
      permissions.rows.map((row) => row.code),
    );
    return {
      data: { storeId, allowed: true },
      meta: { requestId },
      error: null,
    };
  }
}
