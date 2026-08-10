import { BadRequestException, Controller, Get, Headers, Param, Query } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { EmployeeCustomerDetailService } from './employee-customer-detail.service';

@Controller('api/v1/employee/customers')
export class EmployeeCustomerDetailController {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly details: EmployeeCustomerDetailService,
  ) {}

  @Get()
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenantId: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Query('limit') limitRaw?: string,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const context = await this.authorization.require(authorization, 'customer.read', tenantId);
    const limit = Math.min(Math.max(Number(limitRaw) || 50, 1), 100);
    return { data: await this.details.list(context, limit), meta: { requestId }, error: null };
  }

  @Get(':id')
  async detail(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenantId: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Param('id') id: string,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const context = await this.authorization.require(authorization, 'customer.read', tenantId);
    return { data: await this.details.detail(context, id), meta: { requestId }, error: null };
  }
}
