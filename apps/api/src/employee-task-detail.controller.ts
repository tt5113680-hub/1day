import { BadRequestException, Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { EmployeeTaskDetailService } from './employee-task-detail.service';
import { EmployeeWorkbenchService } from './employee-workbench.service';

const meta = (requestId?: string) => {
  if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
  return { requestId };
};

@Controller('api/v1/employee/tasks')
export class EmployeeTaskDetailController {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly details: EmployeeTaskDetailService,
    private readonly workbench: EmployeeWorkbenchService,
  ) {}

  @Get(':id')
  async detail(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Param('id') id: string,
  ) {
    return {
      data: await this.details.detail(await this.authorization.require(a, 'task.read', t), id),
      meta: meta(r),
      error: null,
    };
  }

  @Post(':id/complete')
  async complete(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const request = meta(r);
    return {
      data: await this.workbench.completeOwn(
        await this.authorization.require(a, 'task.manage', t),
        id,
        body,
        request.requestId,
      ),
      meta: request,
      error: null,
    };
  }

  @Post(':id/evidence-links')
  async linkEvidence(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Headers('idempotency-key') k: string | undefined,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const request = meta(r);
    return {
      data: await this.details.linkEvidence(
        await this.authorization.require(a, 'task.manage', t),
        id,
        body,
        k ?? '',
        request.requestId,
      ),
      meta: request,
      error: null,
    };
  }

  @Post(':id/results')
  async recordResult(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Headers('idempotency-key') k: string | undefined,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const request = meta(r);
    return {
      data: await this.details.recordResult(
        await this.authorization.require(a, 'task.manage', t),
        id,
        body,
        k ?? '',
        request.requestId,
      ),
      meta: request,
      error: null,
    };
  }
}
