import { BadRequestException, Body, Controller, Get, Headers, Put } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { ManagementSettingsService } from './management-settings.service';

@Controller('api/v1/management/settings')
export class ManagementSettingsController {
  constructor(
    private readonly auth: AuthorizationService,
    private readonly settings: ManagementSettingsService,
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
  async get(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
  ) {
    return {
      data: await this.settings.get(await this.context(authorization, tenant, requestId)),
      meta: { requestId },
      error: null,
    };
  }

  @Put()
  async update(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    return {
      data: await this.settings.update(
        await this.context(authorization, tenant, requestId),
        body,
        idempotencyKey ?? '',
        requestId!,
      ),
      meta: { requestId },
      error: null,
    };
  }
}
