import { BadRequestException, Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { DataScopeService } from './data-scope.service';
import { PlatformChannelService } from './platform-channel.service';

@Controller('api/v1/platform/channels')
export class PlatformChannelController {
  constructor(
    private readonly auth: AuthorizationService,
    private readonly channels: PlatformChannelService,
    private readonly dataScopes: DataScopeService,
  ) {}

  @Get()
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const context = await this.auth.requirePlatformAny(authorization, [
      'platform.read',
      'platform.manage',
      'channel.read',
      'channel.manage',
    ]);
    const permissionCodes = await this.dataScopes.permissionCodes(
      context.tenantId,
      context.userId,
    );
    const channelIds = await this.dataScopes.networkListIds(
      context.tenantId,
      context.userId,
      'channel',
      permissionCodes,
    );
    return {
      data: await this.channels.list(context, channelIds),
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
      data: await this.channels.create(
        await this.auth.requirePlatform(authorization, 'platform.manage'),
        body,
        key ?? '',
        requestId,
      ),
      meta: { requestId },
      error: null,
    };
  }
}
