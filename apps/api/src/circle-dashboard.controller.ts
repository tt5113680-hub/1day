import { BadRequestException, Controller, Get, Headers } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { CircleDashboardService } from './circle-dashboard.service';

@Controller('api/v1/circle/dashboard')
export class CircleDashboardController {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly dashboard: CircleDashboardService,
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
