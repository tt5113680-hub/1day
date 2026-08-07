import { BadRequestException, Body, Controller, Get, Headers, Put, Param } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { PlatformTenantService } from './platform-tenant.service';
@Controller('api/v1/platform/tenants')
export class PlatformTenantController {
  constructor(
    private readonly auth: AuthorizationService,
    private readonly tenants: PlatformTenantService,
  ) {}
  private async c(a: string | undefined, r: string | undefined, p = 'platform.read') {
    if (!r?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return this.auth.requirePlatform(a, p);
  }
  @Get() async list(
    @Headers('authorization') a: string | undefined,
    @Headers('x-request-id') r: string | undefined,
  ) {
    await this.c(a, r);
    return { data: await this.tenants.list(), meta: { requestId: r }, error: null };
  }
  @Put(':id') async update(
    @Param('id') id: string,
    @Headers('authorization') a: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Headers('idempotency-key') k: string | undefined,
    @Body() b: Record<string, unknown>,
  ) {
    return {
      data: await this.tenants.update(await this.c(a, r, 'platform.manage'), id, b, k ?? '', r!),
      meta: { requestId: r },
      error: null,
    };
  }
}
