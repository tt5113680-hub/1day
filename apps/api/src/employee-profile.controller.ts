import { BadRequestException, Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { EmployeeProfileService } from './employee-profile.service';
import { TaskService } from './task.service';

@Controller('api/v1/employee/profile')
export class EmployeeProfileController {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly profile: EmployeeProfileService,
    private readonly tasks: TaskService,
  ) {}

  @Get()
  async get(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.profile.get(
        await this.authorization.require(authorization, 'task.read', tenant),
      ),
      meta: { requestId },
      error: null,
    };
  }

  @Post('notification-preferences')
  async notificationPreferences(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.tasks.setOwnNotificationPreferences(
        await this.authorization.require(authorization, 'task.manage', tenant),
        body,
        requestId,
      ),
      meta: { requestId },
      error: null,
    };
  }
}
