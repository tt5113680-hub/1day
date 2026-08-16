import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { DataScopeService } from './data-scope.service';
import { ManagementCatalogService } from './management-catalog.service';
import { TenantContextService } from './tenant-context.service';

@Controller('api/v1/management/catalog')
export class ManagementCatalogController {
  constructor(
    private readonly catalog: ManagementCatalogService,
    private readonly dataScopes: DataScopeService,
    private readonly tenantContext: TenantContextService,
  ) {}

  /** Owners see all stores; assigned store managers operate only scoped stores. */
  private async operatorContext(
    authorization: string | undefined,
    tenant: string | undefined,
    requestId: string | undefined,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const context = await this.tenantContext.fromAuthorization(authorization, tenant);
    const permissionCodes = await this.dataScopes.permissionCodes(context.tenantId, context.userId);
    if (permissionCodes.includes('tenant.manage')) {
      return { ...context, storeIds: null as string[] | null, permissionCodes };
    }
    if (!permissionCodes.includes('tenant.read')) throw new ForbiddenException('FORBIDDEN');
    const scopes = await this.dataScopes.resolveStoreScopes(context.tenantId, context.userId);
    if (!scopes.length) throw new ForbiddenException('FORBIDDEN');
    return {
      ...context,
      storeIds: scopes.map((scope) => scope.id),
      permissionCodes,
    };
  }

  private async requireScopedStoreWrite(
    context: Awaited<ReturnType<ManagementCatalogController['operatorContext']>>,
    storeId: string,
  ) {
    await this.dataScopes.requireStoreWriteScope(
      context.tenantId,
      context.userId,
      storeId,
      context.permissionCodes,
    );
  }

  @Get()
  async list(
    @Headers('authorization') authorization?: string,
    @Headers('x-tenant-context') tenant?: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    const context = await this.operatorContext(authorization, tenant, requestId);
    return {
      data: await this.catalog.list(context, context.storeIds),
      meta: { requestId },
      error: null,
    };
  }

  @Post('stores/:storeId/services')
  async createService(
    @Param('storeId') storeId: string,
    @Headers('authorization') authorization?: string,
    @Headers('x-tenant-context') tenant?: string,
    @Headers('x-request-id') requestId?: string,
    @Headers('idempotency-key') key?: string,
    @Body() body: Record<string, unknown> = {},
  ) {
    const context = await this.operatorContext(authorization, tenant, requestId);
    await this.requireScopedStoreWrite(context, storeId);
    return {
      data: await this.catalog.createService(context, storeId, body, key ?? '', requestId!),
      meta: { requestId },
      error: null,
    };
  }

  @Put('services/:serviceId')
  async updateService(
    @Param('serviceId') serviceId: string,
    @Headers('authorization') authorization?: string,
    @Headers('x-tenant-context') tenant?: string,
    @Headers('x-request-id') requestId?: string,
    @Body() body: Record<string, unknown> = {},
  ) {
    const context = await this.operatorContext(authorization, tenant, requestId);
    const storeId = await this.catalog.serviceStoreId(context.tenantId, serviceId);
    if (!storeId) throw new NotFoundException('NOT_FOUND');
    await this.requireScopedStoreWrite(context, storeId);
    return {
      data: await this.catalog.updateService(context, serviceId, body, requestId!),
      meta: { requestId },
      error: null,
    };
  }

  @Post('services/:serviceId/offers')
  async createOffer(
    @Param('serviceId') serviceId: string,
    @Headers('authorization') authorization?: string,
    @Headers('x-tenant-context') tenant?: string,
    @Headers('x-request-id') requestId?: string,
    @Headers('idempotency-key') key?: string,
    @Body() body: Record<string, unknown> = {},
  ) {
    const context = await this.operatorContext(authorization, tenant, requestId);
    const storeId = await this.catalog.serviceStoreId(context.tenantId, serviceId);
    if (!storeId) throw new NotFoundException('NOT_FOUND');
    await this.requireScopedStoreWrite(context, storeId);
    return {
      data: await this.catalog.createOffer(context, serviceId, body, key ?? '', requestId!),
      meta: { requestId },
      error: null,
    };
  }

  @Put('offers/:offerId')
  async updateOffer(
    @Param('offerId') offerId: string,
    @Headers('authorization') authorization?: string,
    @Headers('x-tenant-context') tenant?: string,
    @Headers('x-request-id') requestId?: string,
    @Body() body: Record<string, unknown> = {},
  ) {
    const context = await this.operatorContext(authorization, tenant, requestId);
    const storeId = await this.catalog.offerStoreId(context.tenantId, offerId);
    if (!storeId) throw new NotFoundException('NOT_FOUND');
    await this.requireScopedStoreWrite(context, storeId);
    return {
      data: await this.catalog.updateOffer(context, offerId, body, requestId!),
      meta: { requestId },
      error: null,
    };
  }

  /** G1-W∞-112 — 商品分类树（MPC-03）：按分类返回套餐层级。 */
  @Get('categories')
  async categories(
    @Headers('authorization') authorization?: string,
    @Headers('x-tenant-context') tenant?: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    const context = await this.operatorContext(authorization, tenant, requestId);
    return {
      data: await this.catalog.categoryTree(context, context.storeIds),
      meta: { requestId },
      error: null,
    };
  }

  /** G1-W∞-112 — 跳转排行（MPC-03）：按真实入口跳转痕迹聚合并返回。 */
  @Get('jump-rank')
  async jumpRank(
    @Query('days') days: string | undefined,
    @Headers('authorization') authorization?: string,
    @Headers('x-tenant-context') tenant?: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    const context = await this.operatorContext(authorization, tenant, requestId);
    return {
      data: await this.catalog.jumpRank(context, context.storeIds, days),
      meta: { requestId },
      error: null,
    };
  }

  /** G1-W∞-139 — 按模块点击排行（MPC-03 §2）：点击族入口痕迹按套餐聚合。 */
  @Get('module-click-rank')
  async moduleClickRank(
    @Query('days') days: string | undefined,
    @Headers('authorization') authorization?: string,
    @Headers('x-tenant-context') tenant?: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    const context = await this.operatorContext(authorization, tenant, requestId);
    return {
      data: await this.catalog.moduleClickRank(context, context.storeIds, days),
      meta: { requestId },
      error: null,
    };
  }

  /** G1-W∞-139 — 套餐排序（MPC-03 §2）：单门店内多个套餐按 rank 一次性落序（幂等）。 */
  @Post('stores/:storeId/services/reorder')
  async reorderServices(
    @Param('storeId') storeId: string,
    @Headers('authorization') authorization?: string,
    @Headers('x-tenant-context') tenant?: string,
    @Headers('x-request-id') requestId?: string,
    @Headers('idempotency-key') key?: string,
    @Body() body: Record<string, unknown> = {},
  ) {
    const context = await this.operatorContext(authorization, tenant, requestId);
    await this.requireScopedStoreWrite(context, storeId);
    return {
      data: await this.catalog.reorderServices(context, storeId, body, key ?? '', requestId!),
      meta: { requestId },
      error: null,
    };
  }

  /** G1-W∞-112 — 批量上下架（MPC-03）：单个门店内多个套餐批量置上下架（幂等）。 */
  @Post('stores/:storeId/services/batch-status')
  async batchServiceStatus(
    @Param('storeId') storeId: string,
    @Headers('authorization') authorization?: string,
    @Headers('x-tenant-context') tenant?: string,
    @Headers('x-request-id') requestId?: string,
    @Headers('idempotency-key') key?: string,
    @Body() body: Record<string, unknown> = {},
  ) {
    const context = await this.operatorContext(authorization, tenant, requestId);
    await this.requireScopedStoreWrite(context, storeId);
    return {
      data: await this.catalog.batchSetServiceStatus(context, storeId, body, key ?? '', requestId!),
      meta: { requestId },
      error: null,
    };
  }
}
