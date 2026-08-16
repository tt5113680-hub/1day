import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { ManagementStoreDepthService } from './management-store-depth.service';

@Controller('api/v1/management/stores/depth')
export class ManagementStoreDepthController {
  constructor(
    private readonly auth: AuthorizationService,
    private readonly depth: ManagementStoreDepthService,
  ) {}

  private async context(
    authorization: string | undefined,
    tenant: string | undefined,
    request: string | undefined,
  ) {
    if (!request?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return this.auth.require(authorization, 'tenant.manage', tenant);
  }

  @Post()
  async create(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Headers('idempotency-key') k: string | undefined,
    @Body() b: Record<string, unknown>,
  ) {
    const c = await this.context(a, t, r);
    return {
      data: await this.depth.create(c, b, k ?? '', r!),
      meta: { requestId: r },
      error: null,
    };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Body() b: Record<string, unknown>,
  ) {
    const c = await this.context(a, t, r);
    return {
      data: await this.depth.update(c, id, b, r!),
      meta: { requestId: r },
      error: null,
    };
  }

  @Post('batch-status')
  async batchStatus(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Headers('idempotency-key') k: string | undefined,
    @Body() b: Record<string, unknown>,
  ) {
    const c = await this.context(a, t, r);
    return {
      data: await this.depth.batchStatus(c, b, k ?? '', r!),
      meta: { requestId: r },
      error: null,
    };
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
  ) {
    const c = await this.context(a, t, r);
    return {
      data: await this.depth.remove(c, id, r!),
      meta: { requestId: r },
      error: null,
    };
  }

  @Get(':id/qr-codes')
  async qrCodes(
    @Param('id') id: string,
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
  ) {
    const c = await this.context(a, t, r);
    return {
      data: await this.depth.qrCodes(c, id),
      meta: { requestId: r },
      error: null,
    };
  }
}
