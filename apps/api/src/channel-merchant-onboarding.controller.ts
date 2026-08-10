import { BadRequestException, Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { ChannelMerchantOnboardingService } from './channel-merchant-onboarding.service';
import { DataScopeService } from './data-scope.service';

@Controller('api/v1/channel/merchant-onboardings')
export class ChannelMerchantOnboardingController {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly onboardings: ChannelMerchantOnboardingService,
    private readonly dataScopes: DataScopeService,
  ) {}

  private async channelOperator(authorization: string | undefined, write: boolean) {
    const context = await this.authorization.requirePlatformAny(
      authorization,
      write
        ? ['channel.manage', 'platform.manage']
        : ['channel.read', 'channel.manage', 'platform.read', 'platform.manage'],
    );
    const permissionCodes = await this.dataScopes.permissionCodes(
      context.tenantId,
      context.userId,
    );
    return { context, permissionCodes };
  }

  @Get()
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const { context, permissionCodes } = await this.channelOperator(authorization, false);
    const channelIds = await this.dataScopes.networkListIds(
      context.tenantId,
      context.userId,
      'channel',
      permissionCodes,
    );
    return {
      data: await this.onboardings.list(context.tenantId, channelIds),
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
    const { context, permissionCodes } = await this.channelOperator(authorization, true);
    const channelId = typeof body.channelId === 'string' ? body.channelId : '';
    await this.dataScopes.requireNetworkWriteScope(
      context.tenantId,
      context.userId,
      'channel',
      channelId,
      permissionCodes,
    );
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
    const { context, permissionCodes } = await this.channelOperator(authorization, true);
    const channelId = await this.dataScopes.channelIdForOnboarding(context.tenantId, id);
    if (!channelId) throw new BadRequestException('VALIDATION_ERROR');
    await this.dataScopes.requireNetworkWriteScope(
      context.tenantId,
      context.userId,
      'channel',
      channelId,
      permissionCodes,
    );
    return {
      data: await this.onboardings.updateDelivery(context, id, body, key ?? '', requestId),
      meta: { requestId },
      error: null,
    };
  }
}
