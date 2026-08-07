import { BadRequestException, Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { PlatformSecurityAuditService } from './platform-security-audit.service';
const meta = (requestId?: string) => {
  if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
  return { requestId };
};
@Controller('api/v1/platform/security-audit')
export class PlatformSecurityAuditController {
  constructor(
    private readonly auth: AuthorizationService,
    private readonly audits: PlatformSecurityAuditService,
  ) {}
  @Get() async list(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
  ) {
    const context = await this.auth.requirePlatform(authorization, 'platform.read');
    return { data: await this.audits.list(context), meta: meta(requestId), error: null };
  }
  @Post('acknowledgements') async acknowledge(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    const context = await this.auth.requirePlatform(authorization, 'platform.manage');
    const request = meta(requestId);
    return {
      data: await this.audits.acknowledge(context, body, key ?? '', request.requestId),
      meta: request,
      error: null,
    };
  }
}
