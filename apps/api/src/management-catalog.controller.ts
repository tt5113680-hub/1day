import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { ManagementCatalogService } from './management-catalog.service';

@Controller('api/v1/management/catalog')
export class ManagementCatalogController {
  constructor(
    private readonly auth: AuthorizationService,
    private readonly catalog: ManagementCatalogService,
  ) {}
  private async context(authorization?: string, tenant?: string, requestId?: string) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return this.auth.require(authorization, 'tenant.manage', tenant);
  }
  @Get() async list(
    @Headers('authorization') authorization?: string,
    @Headers('x-tenant-context') tenant?: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    return {
      data: await this.catalog.list(await this.context(authorization, tenant, requestId)),
      meta: { requestId },
      error: null,
    };
  }
  @Post('stores/:storeId/services') async createService(
    @Param('storeId') storeId: string,
    @Headers('authorization') authorization?: string,
    @Headers('x-tenant-context') tenant?: string,
    @Headers('x-request-id') requestId?: string,
    @Headers('idempotency-key') key?: string,
    @Body() body: Record<string, unknown> = {},
  ) {
    return {
      data: await this.catalog.createService(
        await this.context(authorization, tenant, requestId),
        storeId,
        body,
        key ?? '',
        requestId!,
      ),
      meta: { requestId },
      error: null,
    };
  }
  @Put('services/:serviceId') async updateService(
    @Param('serviceId') serviceId: string,
    @Headers('authorization') authorization?: string,
    @Headers('x-tenant-context') tenant?: string,
    @Headers('x-request-id') requestId?: string,
    @Body() body: Record<string, unknown> = {},
  ) {
    return {
      data: await this.catalog.updateService(
        await this.context(authorization, tenant, requestId),
        serviceId,
        body,
        requestId!,
      ),
      meta: { requestId },
      error: null,
    };
  }
  @Post('services/:serviceId/offers') async createOffer(
    @Param('serviceId') serviceId: string,
    @Headers('authorization') authorization?: string,
    @Headers('x-tenant-context') tenant?: string,
    @Headers('x-request-id') requestId?: string,
    @Headers('idempotency-key') key?: string,
    @Body() body: Record<string, unknown> = {},
  ) {
    return {
      data: await this.catalog.createOffer(
        await this.context(authorization, tenant, requestId),
        serviceId,
        body,
        key ?? '',
        requestId!,
      ),
      meta: { requestId },
      error: null,
    };
  }
  @Put('offers/:offerId') async updateOffer(
    @Param('offerId') offerId: string,
    @Headers('authorization') authorization?: string,
    @Headers('x-tenant-context') tenant?: string,
    @Headers('x-request-id') requestId?: string,
    @Body() body: Record<string, unknown> = {},
  ) {
    return {
      data: await this.catalog.updateOffer(
        await this.context(authorization, tenant, requestId),
        offerId,
        body,
        requestId!,
      ),
      meta: { requestId },
      error: null,
    };
  }
}
