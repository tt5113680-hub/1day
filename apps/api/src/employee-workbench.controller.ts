import { BadRequestException, Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { EmployeeWorkbenchService } from './employee-workbench.service';

const meta = (requestId?: string) => {
  if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
  return { requestId };
};

@Controller('api/v1/employee/workbench')
export class EmployeeWorkbenchController {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly workbench: EmployeeWorkbenchService,
  ) {}

  @Get()
  async overview(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
  ) {
    const context = await this.authorization.require(authorization, 'task.read', tenant);
    return { data: await this.workbench.overview(context), meta: meta(requestId), error: null };
  }

  @Post('tasks/:id/complete')
  async complete(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const context = await this.authorization.require(authorization, 'task.manage', tenant);
    const responseMeta = meta(requestId);
    return {
      data: await this.workbench.completeOwn(context, id, body, responseMeta.requestId),
      meta: responseMeta,
      error: null,
    };
  }
}
