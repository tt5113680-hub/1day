import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { DataScopeService } from './data-scope.service';
import { ManagementStoreService } from './management-store.service';
import { TenantContextService } from './tenant-context.service';

@Controller('api/v1/management/stores')
export class ManagementStoreController {
  constructor(
    private readonly auth: AuthorizationService,
    private readonly stores: ManagementStoreService,
    private readonly dataScopes: DataScopeService,
    private readonly tenantContext: TenantContextService,
  ) {}

  private async ownerContext(
    authorization: string | undefined,
    tenant: string | undefined,
    requestId: string | undefined,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return this.auth.require(authorization, 'tenant.manage', tenant);
  }

  /** Tenant owners see all stores; assigned store managers see only scoped stores. */
  private async operatorContext(
    authorization: string | undefined,
    tenant: string | undefined,
    requestId: string | undefined,
    storeId?: string,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const context = await this.tenantContext.fromAuthorization(authorization, tenant);
    const permissionCodes = await this.dataScopes.permissionCodes(
      context.tenantId,
      context.userId,
    );
    if (permissionCodes.includes('tenant.manage')) {
      if (storeId) {
        // owners may operate any store in tenant; existence checked in service
      }
      return { ...context, storeIds: null as string[] | null };
    }
    const canOperate =
      permissionCodes.includes('tenant.read') ||
      permissionCodes.includes('task.manage') ||
      permissionCodes.includes('task.read');
    if (!canOperate) throw new ForbiddenException('FORBIDDEN');
    const scopes = await this.dataScopes.resolveStoreScopes(context.tenantId, context.userId);
    if (!scopes.length) throw new ForbiddenException('FORBIDDEN');
    if (storeId) {
      await this.dataScopes.requireStoreAccess(
        context.tenantId,
        context.userId,
        storeId,
        permissionCodes,
      );
    }
    return { ...context, storeIds: scopes.map((scope) => scope.id) };
  }

  @Get()
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
  ) {
    const context = await this.operatorContext(authorization, tenant, requestId);
    return {
      data: await this.stores.list(context, context.storeIds),
      meta: { requestId },
      error: null,
    };
  }

  @Patch(':id/manager')
  async assign(
    @Param('id') id: string,
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    return {
      data: await this.stores.assignManager(
        await this.ownerContext(authorization, tenant, requestId),
        id,
        body,
        requestId!,
      ),
      meta: { requestId },
      error: null,
    };
  }

  @Put(':id/commercial')
  async commercial(
    @Param('id') id: string,
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    return {
      data: await this.stores.updateCommercial(
        await this.operatorContext(authorization, tenant, requestId, id),
        id,
        body,
        requestId!,
      ),
      meta: { requestId },
      error: null,
    };
  }

  @Post(':id/external-links')
  async createLink(
    @Param('id') id: string,
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    return {
      data: await this.stores.createExternalLink(
        await this.operatorContext(authorization, tenant, requestId, id),
        id,
        body,
        requestId!,
      ),
      meta: { requestId },
      error: null,
    };
  }

  @Patch(':id/external-links/:linkId')
  async updateLink(
    @Param('id') id: string,
    @Param('linkId') linkId: string,
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    return {
      data: await this.stores.updateExternalLink(
        await this.operatorContext(authorization, tenant, requestId, id),
        id,
        linkId,
        body,
        requestId!,
      ),
      meta: { requestId },
      error: null,
    };
  }
}
