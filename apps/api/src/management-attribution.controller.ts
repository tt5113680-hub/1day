import { BadRequestException, Controller, Get, Headers } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { ManagementAttributionService } from './management-attribution.service';
@Controller('api/v1/management/attribution')
export class ManagementAttributionController {
  constructor(
    private readonly auth: AuthorizationService,
    private readonly attribution: ManagementAttributionService,
  ) {}
  @Get() async overview(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.attribution.overview(
        await this.auth.require(authorization, 'tenant.manage', tenant),
      ),
      meta: { requestId },
      error: null,
    };
  }
}
