import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { EmployeeLeadPoolService } from './employee-lead-pool.service';

@Controller('api/v1/employee/leads')
export class EmployeeLeadPoolController {
  constructor(
    private readonly auth: AuthorizationService,
    private readonly leads: EmployeeLeadPoolService,
  ) {}
  @Get() async list(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Query() q: Record<string, unknown>,
  ) {
    if (!r?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.leads.list(await this.auth.require(a, 'customer.read', t), q),
      meta: { requestId: r },
      error: null,
    };
  }
  @Get('assignees') async assignees(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
  ) {
    if (!r?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.leads.assignees(await this.auth.require(a, 'customer.manage', t)),
      meta: { requestId: r },
      error: null,
    };
  }
  @Post('batch/assign') async bulkAssign(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Headers('idempotency-key') k: string | undefined,
    @Body() b: Record<string, unknown>,
  ) {
    if (!r?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.leads.bulkAssign(
        await this.auth.require(a, 'customer.manage', t),
        b,
        k ?? '',
        r,
      ),
      meta: { requestId: r },
      error: null,
    };
  }
  @Post(':id/claim') async claim(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Headers('idempotency-key') k: string | undefined,
    @Param('id') id: string,
    @Body() b: Record<string, unknown>,
  ) {
    if (!r?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.leads.claim(
        await this.auth.require(a, 'customer.manage', t),
        id,
        b,
        k ?? '',
        r,
      ),
      meta: { requestId: r },
      error: null,
    };
  }
  @Post(':id/assign') async assign(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Headers('idempotency-key') k: string | undefined,
    @Param('id') id: string,
    @Body() b: Record<string, unknown>,
  ) {
    if (!r?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.leads.assign(
        await this.auth.require(a, 'customer.manage', t),
        id,
        b,
        k ?? '',
        r,
      ),
      meta: { requestId: r },
      error: null,
    };
  }
  @Post(':id/convert') async convert(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Headers('idempotency-key') k: string | undefined,
    @Param('id') id: string,
    @Body() b: Record<string, unknown>,
  ) {
    if (!r?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.leads.convert(
        await this.auth.require(a, 'customer.manage', t),
        id,
        b,
        k ?? '',
        r,
      ),
      meta: { requestId: r },
      error: null,
    };
  }
}
