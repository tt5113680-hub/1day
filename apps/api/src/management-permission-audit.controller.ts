import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  HttpCode,
  Query,
  Res,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { AuthorizationService } from './authorization.service';
import { ManagementPermissionAuditService } from './management-permission-audit.service';

@Controller('api/v1/management/permission-audit')
export class ManagementPermissionAuditController {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly audit: ManagementPermissionAuditService,
  ) {}

  @Get()
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Query('filter') filter: string | undefined,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const context = await this.authorization.require(authorization, 'tenant.manage', tenant);
    return {
      data: await this.audit.list(context, filter),
      meta: { requestId },
      error: null,
    };
  }

  /**
   * G1-W∞-121 (SAAS-AUDIT): download the tenant's audit records as CSV, honouring the
   * active `filter`. The export write is itself audited + dispatched via Outbox.
   */
  @Get('export')
  @HttpCode(200)
  async export(
    @Res() reply: FastifyReply,
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Query('filter') filter: string | undefined,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const context = await this.authorization.require(authorization, 'tenant.manage', tenant);
    const file = await this.audit.exportAudit(context, filter ?? 'all', requestId);
    return reply
      .header('content-type', 'text/csv; charset=utf-8')
      .header('content-disposition', `attachment; filename="${file.filename}"`)
      .header('x-content-type-options', 'nosniff')
      .send(file.csv);
  }
}
