import { BadRequestException, Controller, Get, Headers, Query } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { WorkflowService } from './workflow.service';

@Controller('api/v1/management/workflows')
export class ManagementWorkflowController {
  constructor(
    private readonly auth: AuthorizationService,
    private readonly workflows: WorkflowService,
  ) {}

  @Get()
  async overview(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenantId: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Query() query: Record<string, unknown>,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const context = await this.auth.requireAny(
      authorization,
      ['tenant.manage', 'workflow.read', 'workflow.manage'],
      tenantId,
    );
    return {
      data: await this.workflows.managementOverview(context, query),
      meta: { requestId },
      error: null,
    };
  }
}
