import { BadRequestException, Body, Controller, Headers, Post } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { ManagementQueueDispositionService } from './management-queue-disposition.service';

@Controller('api/v1/management/dashboard')
export class ManagementQueueDispositionController {
  constructor(
    private readonly auth: AuthorizationService,
    private readonly disposition: ManagementQueueDispositionService,
  ) {}
  @Post('dispositions') async create(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    if (!r?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.disposition.create(
        await this.auth.require(a, 'tenant.manage', t),
        body,
        key ?? '',
        r,
      ),
      meta: { requestId: r },
      error: null,
    };
  }
}
