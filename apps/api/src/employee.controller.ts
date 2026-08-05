import { BadRequestException, Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { EmployeeService } from './employee.service';
const meta = (id?: string) => {
  if (!id) throw new BadRequestException('VALIDATION_ERROR');
  return { requestId: id };
};
@Controller('api/v1')
export class EmployeeController {
  constructor(
    private readonly auth: AuthorizationService,
    private readonly employees: EmployeeService,
  ) {}
  @Get('employees') async list(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
  ) {
    const c = await this.auth.require(a, 'employee.read', t);
    return { data: await this.employees.list(c), meta: meta(r), error: null };
  }
  @Post('employees/invitations') async invite(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Headers('idempotency-key') k: string | undefined,
    @Body() b: Record<string, unknown>,
  ) {
    const c = await this.auth.require(a, 'employee.manage', t);
    const m = meta(r);
    return { data: await this.employees.invite(c, b, k ?? '', m.requestId), meta: m, error: null };
  }
  @Post('employees/invitations/:id/accept') async accept(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Param('id') id: string,
    @Body() b: Record<string, unknown>,
  ) {
    const c = await this.auth.require(a, 'employee.manage', t);
    const m = meta(r);
    return { data: await this.employees.accept(c, id, b, m.requestId), meta: m, error: null };
  }
  @Post('employees/:id/offboard') async offboard(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Param('id') id: string,
    @Body() b: Record<string, unknown>,
  ) {
    const c = await this.auth.require(a, 'employee.manage', t);
    const m = meta(r);
    return {
      data: await this.employees.offboard(c, id, b.version, m.requestId),
      meta: m,
      error: null,
    };
  }
}
