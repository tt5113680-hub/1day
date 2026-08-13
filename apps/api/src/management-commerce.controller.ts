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
  Query,
  Res,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { DataScopeService } from './data-scope.service';
import { ManagementCommerceService } from './management-commerce.service';
import { TenantContextService } from './tenant-context.service';

/**
 * G1-W5: Management PC Order / Review / Marketing admin surfaces (MPC-04/05/07).
 *
 * Tenant owners see the whole tenant; assigned store managers see only scoped
 * stores. Read-only skeletons backed by real, tenant-scoped DB rows.
 * W∞-114: Reviews reply queue — list/filter + pending reply queue + reply write.
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

  /** Resolve a review's owning store then require the caller to write that store. */
  private async requireReviewStoreWrite(
    context: Awaited<ReturnType<ManagementCommerceController['operatorContext']>>,
    reviewId: string,
  ) {
    const storeId = await this.commerce.reviewStoreId(context.tenantId, reviewId);
    if (!storeId) throw new NotFoundException('NOT_FOUND');
    await this.dataScopes.requireStoreWriteScope(
      context.tenantId,
      context.userId,
      storeId,
      context.permissionCodes,
    );
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

  @Get('orders/export')
  async ordersExport(
    @Res() reply: FastifyReply,
    @Headers('authorization') authorization?: string,
    @Headers('x-tenant-context') tenant?: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    const context = await this.operatorContext(authorization, tenant, requestId);
    const file = await this.commerce.exportOrders(context.tenantId, context.storeIds);
    return reply
      .header('content-type', 'text/csv; charset=utf-8')
      .header('content-disposition', `attachment; filename="${file.filename}"`)
      .header('x-content-type-options', 'nosniff')
      .send(file.csv);
  }

  @Get('orders/:id')
  async orderDetail(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
    @Headers('x-tenant-context') tenant?: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    const context = await this.operatorContext(authorization, tenant, requestId);
    return {
      data: await this.commerce.getOrderDetail(context.tenantId, context.storeIds, id),
      meta: { requestId },
      error: null,
    };
  }

  @Get('reviews')
  async reviews(
    @Query('reply') reply: string | undefined,
    @Query('rating') rating: string | undefined,
    @Headers('authorization') authorization?: string,
    @Headers('x-tenant-context') tenant?: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    const context = await this.operatorContext(authorization, tenant, requestId);
    const ratingNum = rating === undefined || rating === '' ? undefined : Number(rating);
    if (ratingNum !== undefined && ![1, 2, 3, 4, 5].includes(ratingNum))
      throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.commerce.listReviews(
        context.tenantId,
        context.storeIds,
        reply ?? 'all',
        ratingNum,
      ),
      meta: { requestId },
      error: null,
    };
  }

  /** G1-W∞-114 — 评价待回复队列（MPC-05）：真实待回复/已回复聚合 + 待回复队列。 */
  @Get('reviews/queue')
  async reviewsQueue(
    @Headers('authorization') authorization?: string,
    @Headers('x-tenant-context') tenant?: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    const context = await this.operatorContext(authorization, tenant, requestId);
    return {
      data: await this.commerce.reviewQueue(context.tenantId, context.storeIds),
      meta: { requestId },
      error: null,
    };
  }

  /** G1-W∞-114 — 评价回复（MPC-05）：在一则本地评价档案上登记回复痕迹（幂等 + 审计/Outbox）。 */
  @Post('reviews/:id/reply')
  async reviewReply(
    @Param('id') id: string,
    @Body() body: Record<string, unknown> = {},
    @Headers('authorization') authorization?: string,
    @Headers('x-tenant-context') tenant?: string,
    @Headers('x-request-id') requestId?: string,
    @Headers('idempotency-key') key?: string,
  ) {
    const context = await this.operatorContext(authorization, tenant, requestId);
    await this.requireReviewStoreWrite(context, id);
    return {
      data: await this.commerce.replyToReview(context, id, body, key ?? '', requestId!),
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
