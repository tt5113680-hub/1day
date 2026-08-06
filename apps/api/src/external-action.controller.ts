import { BadRequestException, Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { ExternalActionService } from './external-action.service';
const meta = (r?: string) => {
  if (!r?.trim()) throw new BadRequestException('VALIDATION_ERROR');
  return { requestId: r };
};
@Controller('api/v1/external-actions')
export class ExternalActionController {
  constructor(
    private readonly auth: AuthorizationService,
    private readonly actions: ExternalActionService,
  ) {}
  @Get() async list(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
  ) {
    const c = await this.auth.require(a, 'action.read', t);
    return { data: await this.actions.list(c), meta: meta(r), error: null };
  }
  @Post() async create(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Headers('idempotency-key') k: string | undefined,
    @Body() b: Record<string, unknown>,
  ) {
    const c = await this.auth.require(a, 'action.manage', t),
      m = meta(r);
    return { data: await this.actions.create(c, b, k ?? '', m.requestId), meta: m, error: null };
  }
  @Post(':id/open') async open(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Param('id') id: string,
    @Body() b: Record<string, unknown>,
  ) {
    const c = await this.auth.require(a, 'action.read', t),
      m = meta(r);
    return { data: await this.actions.open(c, id, b, m.requestId), meta: m, error: null };
  }
}
