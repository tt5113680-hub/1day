import { BadRequestException, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { PlatformOutboxService } from './platform-outbox.service';

const req = (requestId?: string) => {
  if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
  return requestId.trim();
};

@Controller('api/v1/platform/outbox')
export class PlatformOutboxController {
  constructor(
    private readonly auth: AuthorizationService,
    private readonly outbox: PlatformOutboxService,
  ) {}

  @Get('health')
  async health(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
  ) {
    const context = await this.auth.requirePlatform(authorization, 'platform.read');
    void tenant;
    const data = await this.outbox.observability(context);
    return { data, meta: { requestId: req(requestId) }, error: null };
  }

  @Get('dead-letters')
  async deadLetters(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Query('limit') limit: string | undefined,
  ) {
    await this.auth.requirePlatform(authorization, 'platform.read');
    return {
      data: await this.outbox.listDeadLetters(limit ? Number(limit) : 50),
      meta: { requestId: req(requestId) },
      error: null,
    };
  }

  @Post('replay-all')
  async replayAll(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
  ) {
    const context = await this.auth.requirePlatform(authorization, 'platform.manage');
    const id = req(requestId);
    return {
      data: await this.outbox.replayAll(context, id),
      meta: { requestId: id },
      error: null,
    };
  }

  @Post(':tenantId/:eventId/replay')
  async replayOne(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Param('tenantId') tenantId: string,
    @Param('eventId') eventId: string,
  ) {
    const context = await this.auth.requirePlatform(authorization, 'platform.manage');
    return {
      data: await this.outbox.replayOne(context, eventId, tenantId),
      meta: { requestId: req(requestId) },
      error: null,
    };
  }
}
