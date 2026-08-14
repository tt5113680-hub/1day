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
    const context = await this.authorization.requirePlatformAny(authorization, [
      'channel.read',
      'channel.manage',
      'platform.read',
      'platform.manage',
    ]);
    const permissionCodes = await this.dataScopes.permissionCodes(context.tenantId, context.userId);
    const channelIds = await this.dataScopes.networkListIds(
      context.tenantId,
      context.userId,
      'channel',
      permissionCodes,
    );
    const overview = await this.dashboard.overview(context.tenantId, channelIds);
    return {
      data: {
        ...overview,
        scope: {
          type: 'channel',
          restricted: channelIds !== null,
          count: channelIds?.length ?? 0,
        },
      },
      meta: { requestId },
      error: null,
    };
  }
}
