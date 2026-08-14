import { BadRequestException, Controller, Get, Headers } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { SessionSecurityService } from './session-security.service';

@Controller('api/v1/management/session-security')
export class ManagementSessionSecurityController {
  constructor(
    private readonly auth: AuthorizationService,
    private readonly security: SessionSecurityService,
  ) {}

  @Get()
  async report(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.security.report(
        await this.auth.require(authorization, 'tenant.manage', tenant),
      ),
      meta: { requestId },
      error: null,
    };
  }
}
