import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { AuthorizationService } from './authorization.service';
import { ResultEvidenceService } from './result-evidence.service';

const meta = (requestId?: string) => {
  if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
  return { requestId };
};

@Controller('api/v1')
export class ResultEvidenceController {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly results: ResultEvidenceService,
  ) {}

  @Get('customers/:customerId/results')
  async customerResults(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenantId: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Param('customerId') customerId: string,
  ) {
    const context = await this.authorization.require(authorization, 'evidence.read', tenantId);
    return {
      data: await this.results.getCustomerResults(context, customerId),
      meta: meta(requestId),
      error: null,
    };
  }

  @Post('customers/:customerId/orders')
  async createOrder(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenantId: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('idempotency-key') key: string | undefined,
    @Param('customerId') customerId: string,
    @Body() body: Record<string, unknown>,
  ) {
    const context = await this.authorization.require(authorization, 'evidence.manage', tenantId);
    const metadata = meta(requestId);
    return {
      data: await this.results.createOrder(
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

  @Post('orders/:orderId/evidence-files')
  async evidenceFile(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenantId: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('idempotency-key') key: string | undefined,
    @Param('orderId') orderId: string,
    @Body() body: Record<string, unknown>,
  ) {
    const context = await this.authorization.require(authorization, 'evidence.manage', tenantId);
    const metadata = meta(requestId);
    return {
      data: await this.results.addEvidenceFile(
        context,
        orderId,
        body,
        key ?? '',
        metadata.requestId,
      ),
      meta: metadata,
      error: null,
    };
  }

  @Get('evidence-files/:fileId/content')
  async content(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenantId: string | undefined,
    @Param('fileId') fileId: string,
    @Res() reply: FastifyReply,
  ) {
    const context = await this.authorization.require(authorization, 'evidence.read', tenantId);
    const file = await this.results.fileContent(context, fileId);
    return reply
      .header('content-type', file.media_type)
      .header('content-disposition', 'attachment; filename="evidence"')
      .header('x-content-type-options', 'nosniff')
      .send(file.content);
  }

  @Post('orders/:orderId/verification-codes')
  async verificationCode(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenantId: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('idempotency-key') key: string | undefined,
    @Param('orderId') orderId: string,
    @Body() body: Record<string, unknown>,
  ) {
    const context = await this.authorization.require(authorization, 'evidence.manage', tenantId);
    const metadata = meta(requestId);
    return {
      data: await this.results.issueVerificationCode(
        context,
        orderId,
        body,
        key ?? '',
        metadata.requestId,
      ),
      meta: metadata,
      error: null,
    };
  }

  @Post('orders/:orderId/verification-codes/:codeId/redeem')
  async redeem(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenantId: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Param('orderId') orderId: string,
    @Param('codeId') codeId: string,
    @Body() body: Record<string, unknown>,
  ) {
    const context = await this.authorization.require(authorization, 'evidence.manage', tenantId);
    const metadata = meta(requestId);
    return {
      data: await this.results.redeemVerificationCode(
        context,
        orderId,
        codeId,
        body,
        metadata.requestId,
      ),
      meta: metadata,
      error: null,
    };
  }

  @Post('orders/:orderId/connector-results')
  async connectorResult(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenantId: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('idempotency-key') key: string | undefined,
    @Param('orderId') orderId: string,
    @Body() body: Record<string, unknown>,
  ) {
    const context = await this.authorization.require(authorization, 'evidence.manage', tenantId);
    const metadata = meta(requestId);
    return {
      data: await this.results.recordConnectorResult(
        context,
        orderId,
        body,
        key ?? '',
        metadata.requestId,
      ),
      meta: metadata,
      error: null,
    };
  }
}
