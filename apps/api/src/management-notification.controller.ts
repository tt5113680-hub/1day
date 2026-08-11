import { BadRequestException, Controller, Get, Headers, Query } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { ManagementNotificationService } from './management-notification.service';

@Controller('api/v1/management/notifications')
export class ManagementNotificationController {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly notifications: ManagementNotificationService,
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
        await this.authorization.require(authorization, 'tenant.manage', tenant),
        query,
      ),
      meta: { requestId },
      error: null,
    };
  }
}
