import { BadRequestException, Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { CustomerService } from './customer.service';

const meta = (requestId?: string) => {
  if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
  return { requestId };
};

@Controller('api/v1/customers')
export class CustomerController {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly customers: CustomerService,
  ) {}

  @Get()
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenantId: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
  ) {
    const context = await this.authorization.require(authorization, 'customer.read', tenantId);
    return { data: await this.customers.list(context), meta: meta(requestId), error: null };
  }

  @Get(':id')
  async get(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenantId: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Param('id') id: string,
  ) {
    const context = await this.authorization.require(authorization, 'customer.read', tenantId);
    return { data: await this.customers.get(context, id), meta: meta(requestId), error: null };
  }

  @Post()
  async create(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenantId: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    const context = await this.authorization.require(authorization, 'customer.manage', tenantId);
    const metadata = meta(requestId);
    return {
      data: await this.customers.create(context, body, idempotencyKey ?? '', metadata.requestId),
      meta: metadata,
      error: null,
    };
  }

  @Post(':id/identities')
  async addIdentity(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenantId: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const context = await this.authorization.require(authorization, 'customer.manage', tenantId);
    const metadata = meta(requestId);
    return {
      data: await this.customers.addIdentity(context, id, body, metadata.requestId),
      meta: metadata,
      error: null,
    };
  }

  @Post(':id/merge')
  async merge(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenantId: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const context = await this.authorization.require(authorization, 'customer.manage', tenantId);
    const metadata = meta(requestId);
    return {
      data: await this.customers.merge(context, id, body, metadata.requestId),
      meta: metadata,
      error: null,
    };
  }
}
