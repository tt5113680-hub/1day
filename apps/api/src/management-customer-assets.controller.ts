import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { AuthorizationService } from './authorization.service';
import { ManagementCustomerAssetsService } from './management-customer-assets.service';
@Controller('api/v1/management/customers')
export class ManagementCustomerAssetsController {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly customers: ManagementCustomerAssetsService,
  ) {}
  private async context(
    authorization: string | undefined,
    tenant: string | undefined,
    request: string | undefined,
  ) {
    if (!request?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return this.authorization.require(authorization, 'tenant.manage', tenant);
  }
  @Get() async list(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Query() q: Record<string, unknown>,
  ) {
    const c = await this.context(a, t, r);
    return { data: await this.customers.list(c, q), meta: { requestId: r }, error: null };
  }
  @Post('exports') async request(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Headers('idempotency-key') k: string | undefined,
    @Body() b: Record<string, unknown>,
  ) {
    const c = await this.context(a, t, r);
    return {
      data: await this.customers.requestExport(c, b, k ?? '', r!),
      meta: { requestId: r },
      error: null,
    };
  }
  @Post('exports/:id/approve') async approve(
    @Param('id') id: string,
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Body() b: Record<string, unknown>,
  ) {
    const c = await this.context(a, t, r);
    return {
      data: await this.customers.approveExport(c, id, b, r!),
      meta: { requestId: r },
      error: null,
    };
  }
  @Get('assignees') async assignees(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
  ) {
    const c = await this.context(a, t, r);
    return { data: await this.customers.assignees(c), meta: { requestId: r }, error: null };
  }
  @Post('ownership/batch') async batchOwnership(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Headers('idempotency-key') k: string | undefined,
    @Body() b: Record<string, unknown>,
  ) {
    const c = await this.context(a, t, r);
    return {
      data: await this.customers.requestBulkOwnership(c, b, k ?? '', r!),
      meta: { requestId: r },
      error: null,
    };
  }
  @Get('exports/:id/download') async download(
    @Param('id') id: string,
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Res() reply: FastifyReply,
  ) {
    const c = await this.context(a, t, r);
    const file = await this.customers.downloadExport(c, id, r!);
    return reply
      .header('content-type', 'text/csv; charset=utf-8')
      .header('content-disposition', `attachment; filename="${file.filename}"`)
      .header('x-content-type-options', 'nosniff')
      .send(file.csv);
  }
  @Get(':id') async detail(
    @Param('id') id: string,
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
  ) {
    const c = await this.context(a, t, r);
    return { data: await this.customers.detail(c, id), meta: { requestId: r }, error: null };
  }
}
