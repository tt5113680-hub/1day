import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
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
        await this.authorization.require(authorization, 'tenant.manage', tenant),
        id,
        body,
        idempotencyKey ?? '',
        requestId,
      ),
      meta: { requestId },
      error: null,
    };
  }

  @HttpCode(200)
  @Post('batch')
  async batch(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.notifications.batch(
        await this.authorization.require(authorization, 'tenant.manage', tenant),
        body,
        idempotencyKey ?? '',
        requestId,
      ),
      meta: { requestId },
      error: null,
    };
  }

  @Get('settings-audit')
  async settingsAudit(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.notifications.settingsAudit(
        await this.authorization.require(authorization, 'tenant.manage', tenant),
      ),
      meta: { requestId },
      error: null,
    };
  }
}
