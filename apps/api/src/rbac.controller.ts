import { BadRequestException, Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { RbacService } from './rbac.service';
const meta = (r?: string) => {
  if (!r) throw new BadRequestException('VALIDATION_ERROR');
  return { requestId: r };
};
@Controller('api/v1/rbac')
export class RbacController {
  constructor(
    private readonly auth: AuthorizationService,
    private readonly rbac: RbacService,
  ) {}
  @Get('roles') async list(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
  ) {
    const c = await this.auth.require(a, 'tenant.read', t);
    return { data: await this.rbac.list(c), meta: meta(r), error: null };
  }
  @Post('roles') async create(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Headers('idempotency-key') k: string | undefined,
    @Body() b: Record<string, unknown>,
  ) {
    const c = await this.auth.require(a, 'tenant.manage', t);
    const m = meta(r);
    return { data: await this.rbac.create(c, b, k ?? '', m.requestId), meta: m, error: null };
  }
  @Post('roles/:id/permissions') async change(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Param('id') id: string,
    @Body() b: Record<string, unknown>,
  ) {
    const c = await this.auth.require(a, 'tenant.manage', t);
    const m = meta(r);
    return { data: await this.rbac.change(c, id, b, m.requestId), meta: m, error: null };
  }
}
