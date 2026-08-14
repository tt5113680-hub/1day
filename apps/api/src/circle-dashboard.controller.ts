import { BadRequestException, Controller, Get, Headers } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { CircleDashboardService } from './circle-dashboard.service';
import { DataScopeService } from './data-scope.service';

@Controller('api/v1/circle/dashboard')
export class CircleDashboardController {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly dashboard: CircleDashboardService,
    private readonly dataScopes: DataScopeService,
  ) {}

  @Get()
  async overview(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const context = await this.authorization.requirePlatformAny(authorization, [
      'platform.read',
      'platform.manage',
      'circle.manage',
    ]);
    const permissionCodes = await this.dataScopes.permissionCodes(context.tenantId, context.userId);
    const circleIds = await this.dataScopes.networkListIds(
      context.tenantId,
      context.userId,
      'circle',
      permissionCodes,
    );
    const overview = await this.dashboard.overview(context.tenantId, circleIds);
    return {
      data: {
        ...overview,
        scope: {
          type: 'circle',
          restricted: circleIds !== null,
          count: circleIds?.length ?? 0,
        },
      },
      meta: { requestId },
      error: null,
    };
  }
}
