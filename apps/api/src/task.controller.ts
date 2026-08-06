import { BadRequestException, Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { TaskService } from './task.service';

const meta = (requestId?: string) => {
  if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
  return { requestId };
};

@Controller('api/v1/tasks')
export class TaskController {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly tasks: TaskService,
  ) {}
  @Get() async list(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
  ) {
    return {
      data: await this.tasks.list(await this.authorization.require(a, 'task.read', t)),
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
    const c = await this.authorization.require(a, 'task.manage', t),
      m = meta(r);
    return { data: await this.tasks.create(c, b, k ?? '', m.requestId), meta: m, error: null };
  }
  @Post('by-id/:id/complete') async complete(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Param('id') id: string,
    @Body() b: Record<string, unknown>,
  ) {
    const c = await this.authorization.require(a, 'task.manage', t),
      m = meta(r);
    return { data: await this.tasks.complete(c, id, b, m.requestId), meta: m, error: null };
  }
  @Post('actions/process-due') async due(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
  ) {
    const c = await this.authorization.require(a, 'task.manage', t),
      m = meta(r);
    return { data: await this.tasks.processDue(c, m.requestId), meta: m, error: null };
  }
  @Post('notification-preferences') async notificationPreferences(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Body() b: Record<string, unknown>,
  ) {
    const c = await this.authorization.require(a, 'task.manage', t),
      m = meta(r);
    return {
      data: await this.tasks.setNotificationPreferences(c, b, m.requestId),
      meta: m,
      error: null,
    };
  }
}
