import { BadRequestException, Controller, Get, Headers } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { ChannelDashboardService } from './channel-dashboard.service';
import { DataScopeService } from './data-scope.service';

@Controller('api/v1/channel/dashboard')
export class ChannelDashboardController {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly dashboard: ChannelDashboardService,
    private readonly dataScopes: DataScopeService,
  ) {}

  @Get()
  async overview(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const context = await this.authorization.requirePlatform(authorization, 'platform.read');
    const permissionCodes = await this.dataScopes.permissionCodes(
      context.tenantId,
      context.userId,
    );
    const channelIds = await this.dataScopes.networkListIds(
      context.tenantId,
      context.userId,
      'channel',
      permissionCodes,
    );
    return {
      data: await this.dashboard.overview(context.tenantId, channelIds),
      meta: { requestId },
      error: null,
    };
  }
}
