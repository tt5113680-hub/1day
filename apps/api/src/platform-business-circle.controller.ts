import { BadRequestException, Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { PlatformBusinessCircleService } from './platform-business-circle.service';

@Controller('api/v1/platform/business-circles')
export class PlatformBusinessCircleController {
  constructor(
    private readonly auth: AuthorizationService,
    private readonly circles: PlatformBusinessCircleService,
  ) {}

  @Get()
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.circles.list(await this.auth.requirePlatform(authorization)),
      meta: { requestId },
      error: null,
    };
  }

  @Post()
  async create(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.circles.create(
        await this.auth.requirePlatform(authorization, 'platform.manage'),
        body,
        key ?? '',
        requestId,
      ),
      meta: { requestId },
      error: null,
    };
  }

  @Post(':circleId/merchants/:tenantId/approve')
  async approve(
    @Param('circleId') circleId: string,
    @Param('tenantId') tenantId: string,
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.circles.approve(
        await this.auth.requirePlatform(authorization, 'platform.manage'),
        circleId,
        tenantId,
        body,
        key ?? '',
        requestId,
      ),
      meta: { requestId },
      error: null,
    };
  }
}
