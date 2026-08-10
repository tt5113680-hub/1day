import { BadRequestException, Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { WorkflowService } from './workflow.service';

const meta = (requestId?: string) => {
  if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
  return { requestId };
};
@Controller('api/v1/workflows')
export class WorkflowController {
  constructor(
    private readonly auth: AuthorizationService,
    private readonly workflows: WorkflowService,
  ) {}
  @Get() async list(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
  ) {
    return {
      data: await this.workflows.list(await this.auth.require(a, 'workflow.read', t)),
      meta: meta(r),
      error: null,
    };
  }
  @Get('instances/:id') async instance(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Param('id') id: string,
  ) {
    return {
      data: await this.workflows.instance(await this.auth.require(a, 'workflow.read', t), id),
      meta: meta(r),
      error: null,
    };
  }
  @Get(':id/versions/:versionId') async versionDetail(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return {
      data: await this.workflows.versionDetail(
        await this.auth.require(a, 'workflow.read', t),
        id,
        versionId,
      ),
      meta: meta(r),
      error: null,
    };
  }
  @Get(':id') async detail(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Param('id') id: string,
  ) {
    return {
      data: await this.workflows.detail(await this.auth.require(a, 'workflow.read', t), id),
      meta: meta(r),
      error: null,
    };
  }
  @Post() async create(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Headers('idempotency-key') k: string | undefined,
    @Body() b: Record<string, unknown>,
  ) {
    const c = await this.auth.require(a, 'workflow.manage', t),
      m = meta(r);
    return { data: await this.workflows.create(c, b, k ?? '', m.requestId), meta: m, error: null };
  }
  @Post(':id/versions') async version(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Param('id') id: string,
    @Body() b: Record<string, unknown>,
  ) {
    const c = await this.auth.require(a, 'workflow.manage', t),
      m = meta(r);
    return {
      data: await this.workflows.createVersion(c, id, b, m.requestId),
      meta: m,
      error: null,
    };
  }
  @Post(':id/publish') async publish(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Param('id') id: string,
    @Body() b: Record<string, unknown>,
  ) {
    const c = await this.auth.require(a, 'workflow.manage', t),
      m = meta(r);
    return { data: await this.workflows.publish(c, id, b, m.requestId), meta: m, error: null };
  }
  @Post(':id/instances') async start(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Headers('idempotency-key') k: string | undefined,
    @Param('id') id: string,
    @Body() b: Record<string, unknown>,
  ) {
    const c = await this.auth.require(a, 'workflow.manage', t),
      m = meta(r);
    return {
      data: await this.workflows.start(c, id, b, k ?? '', m.requestId),
      meta: m,
      error: null,
    };
  }
  @Post('instances/:instanceId/steps/:stepId/:action') async decide(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Param('instanceId') instanceId: string,
    @Param('stepId') stepId: string,
    @Param('action') action: string,
    @Body() b: Record<string, unknown>,
  ) {
    if (!['complete', 'approve', 'reject'].includes(action))
      throw new BadRequestException('VALIDATION_ERROR');
    const c = await this.auth.require(a, 'workflow.manage', t),
      m = meta(r);
    return {
      data: await this.workflows.decide(
        c,
        instanceId,
        stepId,
        b,
        action as 'complete' | 'approve' | 'reject',
        m.requestId,
      ),
      meta: m,
      error: null,
    };
  }
  @Post('actions/process-timeouts') async timeouts(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
  ) {
    const c = await this.auth.require(a, 'workflow.manage', t),
      m = meta(r);
    return { data: await this.workflows.processTimeouts(c, m.requestId), meta: m, error: null };
  }
}
