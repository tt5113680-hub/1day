import { BadRequestException, Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { PlatformChannelService } from './platform-channel.service';

@Controller('api/v1/platform/channels')
export class PlatformChannelController {
  constructor(
    private readonly auth: AuthorizationService,
    private readonly channels: PlatformChannelService,
  ) {}

  @Get()
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.channels.list(await this.auth.requirePlatform(authorization)),
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
