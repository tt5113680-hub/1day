import { BadRequestException, Controller, Get, Headers, Param } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { EmployeeCustomerDetailService } from './employee-customer-detail.service';

@Controller('api/v1/employee/customers')
export class EmployeeCustomerDetailController {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly details: EmployeeCustomerDetailService,
  ) {}

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
