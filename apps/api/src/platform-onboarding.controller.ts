import { BadRequestException, Body, Controller, Headers, Post } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { PlatformOnboardingService } from './platform-onboarding.service';
@Controller('api/v1/platform/onboarding')
export class PlatformOnboardingController {
  constructor(
    private readonly auth: AuthorizationService,
    private readonly onboarding: PlatformOnboardingService,
  ) {}
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
