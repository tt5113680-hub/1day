import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { OrganizationService } from './organization.service';

function meta(requestId: string | undefined) {
  if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
  return { requestId };
}

@Controller('api/v1')
export class OrganizationController {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly organizations: OrganizationService,
  ) {}

  @Get('organizations')
  async listOrganizations(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenantId: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
  ) {
    const context = await this.authorization.require(authorization, 'organization.read', tenantId);
    return {
      data: await this.organizations.listOrganizations(context),
      meta: meta(requestId),
      error: null,
    };
  }

  @Post('organizations')
  async createOrganization(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenantId: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    const context = await this.authorization.require(
      authorization,
      'organization.manage',
      tenantId,
    );
    const metadata = meta(requestId);
    if (!idempotencyKey) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.organizations.createOrganization(
        context,
        body,
        idempotencyKey,
        metadata.requestId,
      ),
      meta: metadata,
      error: null,
    };
  }

  @Patch('organizations/:id')
  async updateOrganization(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenantId: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const context = await this.authorization.require(
      authorization,
      'organization.manage',
      tenantId,
    );
    const metadata = meta(requestId);
    return {
      data: await this.organizations.updateOrganization(context, id, body, metadata.requestId),
      meta: metadata,
      error: null,
    };
  }

  @Get('merchants')
  async listMerchants(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenantId: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
  ) {
    const context = await this.authorization.require(authorization, 'organization.read', tenantId);
    return {
      data: await this.organizations.listMerchants(context),
      meta: meta(requestId),
      error: null,
    };
  }

  @Post('merchants')
  async createMerchant(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenantId: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    const context = await this.authorization.require(
      authorization,
      'organization.manage',
      tenantId,
    );
    const metadata = meta(requestId);
    if (!idempotencyKey) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.organizations.createMerchant(
        context,
        body,
        idempotencyKey,
        metadata.requestId,
      ),
      meta: metadata,
      error: null,
    };
  }

  @Get('stores')
  async listStores(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenantId: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
  ) {
    const context = await this.authorization.require(authorization, 'organization.read', tenantId);
    return {
      data: await this.organizations.listStores(context),
      meta: meta(requestId),
      error: null,
    };
  }

  @Post('stores')
  async createStore(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenantId: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    const context = await this.authorization.require(
      authorization,
      'organization.manage',
      tenantId,
    );
    const metadata = meta(requestId);
    if (!idempotencyKey) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.organizations.createStore(context, body, idempotencyKey, metadata.requestId),
      meta: metadata,
      error: null,
    };
  }
}
