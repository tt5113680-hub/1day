import { BadRequestException, Body, Controller, Get, Headers, Param, Patch } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { ManagementStoreService } from './management-store.service';

@Controller('api/v1/management/stores')
export class ManagementStoreController {
  constructor(
    private readonly auth: AuthorizationService,
    private readonly stores: ManagementStoreService,
  ) {}
  private async context(
    authorization: string | undefined,
    tenant: string | undefined,
    requestId: string | undefined,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return this.auth.require(authorization, 'tenant.manage', tenant);
  }
  @Get()
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
  ) {
    return {
      data: await this.stores.list(await this.context(authorization, tenant, requestId)),
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
        await this.context(authorization, tenant, requestId),
        id,
        body,
        requestId!,
      ),
      meta: { requestId },
      error: null,
    };
  }
}
