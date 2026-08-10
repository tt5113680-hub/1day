import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Headers,
} from '@nestjs/common';
import { DataScopeService } from './data-scope.service';
import { ManagementCommerceService } from './management-commerce.service';
import { TenantContextService } from './tenant-context.service';

/**
 * G1-W5: Management PC Order / Review / Marketing admin surfaces (MPC-04/05/07).
 *
 * Tenant owners see the whole tenant; assigned store managers see only scoped
 * stores. Read-only skeletons backed by real, tenant-scoped DB rows.
 */
@Controller('api/v1/management/commerce')
export class ManagementCommerceController {
  constructor(
    private readonly commerce: ManagementCommerceService,
    private readonly dataScopes: DataScopeService,
    private readonly tenantContext: TenantContextService,
  ) {}

  private async operatorContext(
    authorization: string | undefined,
    tenant: string | undefined,
    requestId: string | undefined,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const context = await this.tenantContext.fromAuthorization(authorization, tenant);
    const permissionCodes = await this.dataScopes.permissionCodes(
      context.tenantId,
      context.userId,
    );
    if (permissionCodes.includes('tenant.manage')) {
      return { ...context, storeIds: null as string[] | null };
    }
    if (!permissionCodes.includes('tenant.read')) throw new ForbiddenException('FORBIDDEN');
    const scopes = await this.dataScopes.resolveStoreScopes(context.tenantId, context.userId);
    if (!scopes.length) throw new ForbiddenException('FORBIDDEN');
    return {
      ...context,
      storeIds: scopes.map((scope) => scope.id),
    };
  }

  @Get('orders')
  async orders(
    @Headers('authorization') authorization?: string,
    @Headers('x-tenant-context') tenant?: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    const context = await this.operatorContext(authorization, tenant, requestId);
    return {
      data: await this.commerce.listOrders(context.tenantId, context.storeIds),
      meta: { requestId },
      error: null,
    };
  }

  @Get('reviews')
  async reviews(
    @Headers('authorization') authorization?: string,
    @Headers('x-tenant-context') tenant?: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    const context = await this.operatorContext(authorization, tenant, requestId);
    return {
      data: await this.commerce.listReviews(context.tenantId, context.storeIds),
      meta: { requestId },
      error: null,
    };
  }

  @Get('marketing')
  async marketing(
    @Headers('authorization') authorization?: string,
    @Headers('x-tenant-context') tenant?: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    const context = await this.operatorContext(authorization, tenant, requestId);
    return {
      data: await this.commerce.listMarketing(context.tenantId, context.storeIds),
      meta: { requestId },
      error: null,
    };
  }
}
