import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Post,
} from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { DataScopeService } from './data-scope.service';
import { ManagementContentService } from './management-content.service';
import { TenantContextService } from './tenant-context.service';

@Controller('api/v1/management/content')
export class ManagementContentController {
  constructor(
    private readonly auth: AuthorizationService,
    private readonly content: ManagementContentService,
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

  /** Owners see all content; store managers list approved items and place on scoped stores. */
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
      data: await this.content.list(context, context.storeIds),
      meta: { requestId },
      error: null,
    };
  }

  @Post()
  async create(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    return {
      data: await this.content.create(
        await this.ownerContext(authorization, tenant, requestId),
        body,
        key ?? '',
        requestId!,
      ),
      meta: { requestId },
      error: null,
    };
  }

  @Post(':id/approve')
  async approve(
    @Param('id') id: string,
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    return {
      data: await this.content.approve(
        await this.ownerContext(authorization, tenant, requestId),
        id,
        body,
        requestId!,
      ),
      meta: { requestId },
      error: null,
    };
  }

  @Post(':id/distributions')
  async distribute(
    @Param('id') id: string,
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    return {
      data: await this.content.distribute(
        await this.ownerContext(authorization, tenant, requestId),
        id,
        body,
        requestId!,
      ),
      meta: { requestId },
      error: null,
    };
  }

  @Post(':id/placements')
  async place(
    @Param('id') id: string,
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    const context = await this.operatorContext(authorization, tenant, requestId);
    const storeId = typeof body.storeId === 'string' ? body.storeId : '';
    const permissionCodes = await this.dataScopes.permissionCodes(
      context.tenantId,
      context.userId,
    );
    await this.dataScopes.requireStoreWriteScope(
      context.tenantId,
      context.userId,
      storeId,
      permissionCodes,
    );
    return {
      data: await this.content.place(context, id, body, requestId!),
      meta: { requestId },
      error: null,
    };
  }
}
