import { BadRequestException, Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { ManagementConnectorService } from './management-connector.service';
@Controller('api/v1/management/connectors')
export class ManagementConnectorController {
  constructor(
    private readonly auth: AuthorizationService,
    private readonly connectors: ManagementConnectorService,
  ) {}
  private async c(a: string | undefined, t: string | undefined, r: string | undefined) {
    if (!r?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return this.auth.require(a, 'tenant.manage', t);
  }
  @Get() async list(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
  ) {
    return {
      data: await this.connectors.list(await this.c(a, t, r)),
      meta: { requestId: r },
      error: null,
    };
  }
  @Post('authorization-requests') async request(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Headers('idempotency-key') k: string | undefined,
    @Body() b: Record<string, unknown>,
  ) {
    return {
      data: await this.connectors.requestAuthorization(await this.c(a, t, r), b, k ?? '', r!),
      meta: { requestId: r },
      error: null,
    };
  }
}
