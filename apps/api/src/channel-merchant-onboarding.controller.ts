import { BadRequestException, Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { ChannelMerchantOnboardingService } from './channel-merchant-onboarding.service';

@Controller('api/v1/channel/merchant-onboardings')
export class ChannelMerchantOnboardingController {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly onboardings: ChannelMerchantOnboardingService,
  ) {}

  @Get()
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const context = await this.authorization.requirePlatform(authorization, 'platform.read');
    return {
      data: await this.onboardings.list(context.tenantId),
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
    const context = await this.authorization.requirePlatform(authorization, 'platform.manage');
    return {
      data: await this.onboardings.create(context, body, key ?? '', requestId),
      meta: { requestId },
      error: null,
    };
  }

  @Post(':id/delivery')
  async updateDelivery(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('idempotency-key') key: string | undefined,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const context = await this.authorization.requirePlatform(authorization, 'platform.manage');
    return {
      data: await this.onboardings.updateDelivery(context, id, body, key ?? '', requestId),
      meta: { requestId },
      error: null,
    };
  }
}
