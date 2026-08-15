import { BadRequestException, Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { PlatformOnboardingService } from './platform-onboarding.service';
@Controller('api/v1/platform/onboarding')
export class PlatformOnboardingController {
  constructor(
    private readonly auth: AuthorizationService,
    private readonly onboarding: PlatformOnboardingService,
  ) {}
  @Get(':runId') async get(
    @Headers('authorization') a: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Param('runId') runId: string,
  ) {
    if (!r?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.onboarding.get(await this.auth.requirePlatform(a, 'platform.manage'), runId),
      meta: { requestId: r },
      error: null,
    };
  }
  @Post(':runId/resume') async resume(
    @Headers('authorization') a: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Param('runId') runId: string,
    @Body() b: Record<string, unknown>,
  ) {
    if (!r?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.onboarding.resume(
        await this.auth.requirePlatform(a, 'platform.manage'),
        runId,
        r,
        b ?? {},
      ),
      meta: { requestId: r },
      error: null,
    };
  }
  @Post(':runId/delivery/revoke') async revokeDelivery(
    @Headers('authorization') a: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Param('runId') runId: string,
    @Body() b: Record<string, unknown>,
  ) {
    if (!r?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.onboarding.revokeDeliveryScene(
        await this.auth.requirePlatform(a, 'platform.manage'),
        runId,
        typeof b.scene === 'string' ? b.scene : '',
        r,
      ),
      meta: { requestId: r },
      error: null,
    };
  }
  @Post() async create(
    @Headers('authorization') a: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Headers('idempotency-key') k: string | undefined,
    @Body() b: Record<string, unknown>,
  ) {
    if (!r?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.onboarding.create(
        await this.auth.requirePlatform(a, 'platform.manage'),
        b,
        k ?? '',
        r,
      ),
      meta: { requestId: r },
      error: null,
    };
  }
}
