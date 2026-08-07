import { BadRequestException, Controller, Get, Headers } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { PlatformDashboardService } from './platform-dashboard.service';
@Controller('api/v1/platform/dashboard')
export class PlatformDashboardController {
  constructor(
    private readonly auth: AuthorizationService,
    private readonly dashboard: PlatformDashboardService,
  ) {}
  @Get()
  async overview(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    await this.auth.requirePlatform(authorization);
    return { data: await this.dashboard.overview(), meta: { requestId }, error: null };
  }
}
