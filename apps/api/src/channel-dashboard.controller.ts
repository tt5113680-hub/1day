import { BadRequestException, Controller, Get, Headers } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { ChannelDashboardService } from './channel-dashboard.service';

@Controller('api/v1/channel/dashboard')
export class ChannelDashboardController {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly dashboard: ChannelDashboardService,
  ) {}

  @Get()
  async overview(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const context = await this.authorization.requirePlatform(authorization, 'platform.read');
    return {
      data: await this.dashboard.overview(context.tenantId),
      meta: { requestId },
      error: null,
    };
  }
}
