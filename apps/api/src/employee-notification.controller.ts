import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { EmployeeNotificationService } from './employee-notification.service';

@Controller('api/v1/employee/notifications')
export class EmployeeNotificationController {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly notifications: EmployeeNotificationService,
  ) {}

  @Get()
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Query() query: Record<string, unknown>,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.notifications.list(
        await this.authorization.require(authorization, 'task.read', tenant),
        query,
      ),
      meta: { requestId },
      error: null,
    };
  }

  @Patch(':id/read')
  async read(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.notifications.markRead(
        await this.authorization.require(authorization, 'task.manage', tenant),
        id,
        body,
        idempotencyKey ?? '',
        requestId,
      ),
      meta: { requestId },
      error: null,
    };
  }
}
