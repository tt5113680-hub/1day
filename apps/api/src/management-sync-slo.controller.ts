import { BadRequestException, Controller, Get, Headers } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { SyncSloService } from './sync-slo.service';

@Controller('api/v1/management/sync-slo')
export class ManagementSyncSloController {
  constructor(
    private readonly auth: AuthorizationService,
    private readonly slo: SyncSloService,
  ) {}

  @Get()
  async report(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.slo.report(await this.auth.require(authorization, 'tenant.manage', tenant)),
      meta: { requestId },
      error: null,
    };
  }
}
