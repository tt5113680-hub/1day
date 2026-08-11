import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { EntryFunnelService } from './entry-funnel.service';

@Controller('api/v1')
export class EntryFunnelController {
  constructor(
    private readonly funnel: EntryFunnelService,
    private readonly auth: AuthorizationService,
  ) {}

  /** Public batch ingest for L0+L1+L2 entry traces (no payment fields). */
  @Post('consumer/funnel/events')
  async ingest(
    @Query('tenant') tenant: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    return {
      data: await this.funnel.ingest(tenant ?? '', body ?? {}),
      meta: { public: true },
      error: null,
    };
  }

  /** Module-named entry-trace board for management. */
  @Get('management/entry-funnel/summary')
  async summary(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Query('days') days: string | undefined,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const context = await this.auth.require(authorization, 'tenant.manage', tenant);
    return {
      data: await this.funnel.summary(context.tenantId, days),
      meta: { requestId },
      error: null,
    };
  }

  @Get('management/tenant/platform-visibility')
  async getVisibility(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const context = await this.auth.require(authorization, 'tenant.manage', tenant);
    return {
      data: await this.funnel.getPlatformVisibleTrafficById(context.tenantId),
      meta: { requestId },
      error: null,
    };
  }

  /** Tenant owner toggles「全平台可见引流」. */
  @Put('management/tenant/platform-visibility')
  async visibility(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const context = await this.auth.require(authorization, 'tenant.manage', tenant);
    const enabled = Boolean(body?.platformVisibleTraffic ?? body?.platform_visible_traffic);
    return {
      data: await this.funnel.setPlatformVisibleTrafficById(context.tenantId, enabled),
      meta: { requestId },
      error: null,
    };
  }
}
