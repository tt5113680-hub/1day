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
} from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { DataScopeService } from './data-scope.service';
import { MembershipCommercialService } from './membership-commercial.service';
import { TenantContextService } from './tenant-context.service';

@Controller('api/v1')
export class MembershipCommercialController {
  constructor(
    private readonly auth: AuthorizationService,
    private readonly memberships: MembershipCommercialService,
    private readonly dataScopes: DataScopeService,
    private readonly tenantContext: TenantContextService,
  ) {}

  private async employeeContext(
    authorization?: string,
    tenant?: string,
    requestId?: string,
    permission = 'task.manage',
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return this.auth.require(authorization, permission, tenant);
  }

  /** Owners see all memberships; store managers list/grant only scoped stores. */
  private async managementOperatorContext(
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

  @Post('consumer/memberships/enroll')
  async enroll(
    @Query('tenant') tenant: string | undefined,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    return {
      data: await this.memberships.enroll(tenant ?? '', body, key ?? ''),
      meta: { public: true },
      error: null,
    };
  }

  @Post('consumer/memberships/resume')
  async resume(
    @Query('tenant') tenant: string | undefined,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    return {
      data: await this.memberships.resume(tenant ?? '', body, key ?? ''),
      meta: { public: true },
      error: null,
    };
  }

  @Get('consumer/memberships/wallet')
  async wallet(
    @Query('tenant') tenant: string | undefined,
    @Query('accessId') accessId: string | undefined,
    @Query('access') access: string | undefined,
  ) {
    return {
      data: await this.memberships.wallet(tenant ?? '', accessId ?? '', access ?? ''),
      meta: { public: true },
      error: null,
    };
  }

  @Get('management/memberships')
  async list(
    @Headers('authorization') a?: string,
    @Headers('x-tenant-context') t?: string,
    @Headers('x-request-id') r?: string,
  ) {
    const context = await this.managementOperatorContext(a, t, r);
    return {
      data: await this.memberships.list(context, context.storeIds),
      meta: { requestId: r },
      error: null,
    };
  }

  @Post('management/memberships/:id/grants')
  async grant(
    @Param('id') id: string,
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    const context = await this.managementOperatorContext(a, t, r);
    const storeId = await this.memberships.enrollmentStoreId(context.tenantId, id);
    if (!storeId) throw new NotFoundException('NOT_FOUND');
    await this.dataScopes.requireStoreWriteScope(
      context.tenantId,
      context.userId,
      storeId,
      context.permissionCodes,
    );
    return {
      data: await this.memberships.grant(context, id, body, key ?? ''),
      meta: { requestId: r },
      error: null,
    };
  }

  @Post('management/memberships/:id/revokes')
  async revoke(
    @Param('id') id: string,
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    const context = await this.managementOperatorContext(a, t, r);
    const storeId = await this.memberships.enrollmentStoreId(context.tenantId, id);
    if (!storeId) throw new NotFoundException('NOT_FOUND');
    await this.dataScopes.requireStoreWriteScope(
      context.tenantId,
      context.userId,
      storeId,
      context.permissionCodes,
    );
    return {
      data: await this.memberships.revoke(context, id, body, key ?? ''),
      meta: { requestId: r },
      error: null,
    };
  }

  @Get('management/memberships/:id/ledger')
  async ledger(
    @Param('id') id: string,
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
  ) {
    const context = await this.managementOperatorContext(a, t, r);
    return {
      data: await this.memberships.ledger(context, id, context.storeIds),
      meta: { requestId: r },
      error: null,
    };
  }

  @Post('employee/memberships/redeem')
  async redeem(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    return {
      data: await this.memberships.redeem(
        await this.employeeContext(a, t, r, 'task.manage'),
        body,
        key ?? '',
      ),
      meta: { requestId: r },
      error: null,
    };
  }

  @Get('employee/memberships/benefits')
  async employeeBenefits(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
  ) {
    return {
      data: await this.memberships.benefits(await this.employeeContext(a, t, r, 'task.read')),
      meta: { requestId: r },
      error: null,
    };
  }

  @Get('employee/memberships/overview')
  async employeeMembershipOverview(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
  ) {
    return {
      data: await this.memberships.employeeOverview(
        await this.employeeContext(a, t, r, 'task.read'),
      ),
      meta: { requestId: r },
      error: null,
    };
  }
}
