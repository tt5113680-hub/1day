import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { EmployeeNurtureService } from './employee-nurture.service';

@Controller('api/v1/employee/nurture')
export class EmployeeNurtureController {
  constructor(
    private readonly auth: AuthorizationService,
    private readonly nurture: EmployeeNurtureService,
  ) {}

  @Get()
  async list(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Query() q: Record<string, unknown>,
  ) {
    if (!r?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.nurture.list(await this.auth.require(a, 'customer.read', t), q),
      meta: { requestId: r },
      error: null,
    };
  }

  @Patch(':customerId')
  async update(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Headers('idempotency-key') k: string | undefined,
    @Param('customerId') id: string,
    @Body() b: Record<string, unknown>,
  ) {
    if (!r?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.nurture.updateSegment(
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

  @Post(':customerId/touchpoints')
  async touch(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Headers('idempotency-key') k: string | undefined,
    @Param('customerId') id: string,
    @Body() b: Record<string, unknown>,
  ) {
    if (!r?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.nurture.touch(
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
