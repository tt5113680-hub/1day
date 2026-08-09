import { BadRequestException, Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { ManagementContentService } from './management-content.service';
@Controller('api/v1/management/content')
export class ManagementContentController {
  constructor(
    private readonly auth: AuthorizationService,
    private readonly content: ManagementContentService,
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
      data: await this.content.list(await this.c(a, t, r)),
      meta: { requestId: r },
      error: null,
    };
  }
  @Post() async create(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Headers('idempotency-key') k: string | undefined,
    @Body() b: Record<string, unknown>,
  ) {
    return {
      data: await this.content.create(await this.c(a, t, r), b, k ?? '', r!),
      meta: { requestId: r },
      error: null,
    };
  }
  @Post(':id/approve') async approve(
    @Param('id') id: string,
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Body() b: Record<string, unknown>,
  ) {
    return {
      data: await this.content.approve(await this.c(a, t, r), id, b, r!),
      meta: { requestId: r },
      error: null,
    };
  }
  @Post(':id/distributions') async distribute(
    @Param('id') id: string,
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Body() b: Record<string, unknown>,
  ) {
    return {
      data: await this.content.distribute(await this.c(a, t, r), id, b, r!),
      meta: { requestId: r },
      error: null,
    };
  }
  @Post(':id/placements') async place(
    @Param('id') id: string,
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Body() b: Record<string, unknown>,
  ) {
    return {
      data: await this.content.place(await this.c(a, t, r), id, b, r!),
      meta: { requestId: r },
      error: null,
    };
  }
}
