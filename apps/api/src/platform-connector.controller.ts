import { BadRequestException, Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { PlatformConnectorService } from './platform-connector.service';

const meta = (requestId?: string) => {
  if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
  return { requestId };
};

@Controller('api/v1/platform/connectors')
export class PlatformConnectorController {
  constructor(
    private readonly auth: AuthorizationService,
    private readonly connectors: PlatformConnectorService,
  ) {}
  @Get() async list(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
  ) {
    const context = await this.auth.requirePlatform(authorization, 'platform.read');
    return { data: await this.connectors.list(context), meta: meta(requestId), error: null };
  }
  @Post() async create(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    const context = await this.auth.requirePlatform(authorization, 'platform.manage');
    const request = meta(requestId);
    return {
      data: await this.connectors.create(context, body, key ?? '', request.requestId),
      meta: request,
      error: null,
    };
  }
  @Post(':id/health-observations') async observe(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('idempotency-key') key: string | undefined,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const context = await this.auth.requirePlatform(authorization, 'platform.manage');
    const request = meta(requestId);
    return {
      data: await this.connectors.observe(context, id, body, key ?? '', request.requestId),
      meta: request,
      error: null,
    };
  }
}
