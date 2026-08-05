import { BadRequestException, Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { AttributionService } from './attribution.service';
import { AuthorizationService } from './authorization.service';

const meta = (requestId?: string) => {
  if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
  return { requestId };
};

@Controller('api/v1')
export class AttributionController {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly attribution: AttributionService,
  ) {}

  @Get('customers/:id/attribution')
  async get(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenantId: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Param('id') customerId: string,
  ) {
    const context = await this.authorization.require(authorization, 'attribution.read', tenantId);
    return {
      data: await this.attribution.get(context, customerId),
      meta: meta(requestId),
      error: null,
    };
  }

  @Post('customers/:id/sources')
  async source(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenantId: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('idempotency-key') key: string | undefined,
    @Param('id') customerId: string,
    @Body() body: Record<string, unknown>,
  ) {
    const context = await this.authorization.require(authorization, 'attribution.manage', tenantId);
    const metadata = meta(requestId);
    return {
      data: await this.attribution.recordSource(
        context,
        customerId,
        body,
        key ?? '',
        metadata.requestId,
      ),
      meta: metadata,
      error: null,
    };
  }

  @Post('customers/:id/contributions')
  async contribution(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenantId: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('idempotency-key') key: string | undefined,
    @Param('id') customerId: string,
    @Body() body: Record<string, unknown>,
  ) {
    const context = await this.authorization.require(authorization, 'attribution.manage', tenantId);
    const metadata = meta(requestId);
    return {
      data: await this.attribution.recordContribution(
        context,
        customerId,
        body,
        key ?? '',
        metadata.requestId,
      ),
      meta: metadata,
      error: null,
    };
  }

  @Post('customers/:id/ownership-transfers')
  async transfer(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenantId: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('idempotency-key') key: string | undefined,
    @Param('id') customerId: string,
    @Body() body: Record<string, unknown>,
  ) {
    const context = await this.authorization.require(authorization, 'attribution.manage', tenantId);
    const metadata = meta(requestId);
    return {
      data: await this.attribution.requestTransfer(
        context,
        customerId,
        body,
        key ?? '',
        metadata.requestId,
      ),
      meta: metadata,
      error: null,
    };
  }

  @Post('ownership-transfers/:id/approve')
  async approve(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenantId: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Param('id') transferId: string,
    @Body() body: Record<string, unknown>,
  ) {
    const context = await this.authorization.require(authorization, 'ownership.approve', tenantId);
    const metadata = meta(requestId);
    return {
      data: await this.attribution.approveTransfer(context, transferId, body, metadata.requestId),
      meta: metadata,
      error: null,
    };
  }
}
