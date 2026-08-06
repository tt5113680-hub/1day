import { BadRequestException, Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { EmployeeFollowUpService } from './employee-follow-up.service';
@Controller('api/v1/employee/tasks')
export class EmployeeFollowUpController {
  constructor(
    private readonly auth: AuthorizationService,
    private readonly followUps: EmployeeFollowUpService,
  ) {}
  @Get(':id/follow-ups') async list(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Param('id') id: string,
  ) {
    if (!r?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.followUps.list(await this.auth.require(a, 'task.read', t), id),
      meta: { requestId: r },
      error: null,
    };
  }
  @Post(':id/follow-ups') async create(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Headers('idempotency-key') k: string | undefined,
    @Param('id') id: string,
    @Body() b: Record<string, unknown>,
  ) {
    if (!r?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.followUps.create(
        await this.auth.require(a, 'task.manage', t),
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
