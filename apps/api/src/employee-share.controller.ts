import { BadRequestException, Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { EmployeeShareService } from './employee-share.service';

@Controller('api/v1/employee/share-codes')
export class EmployeeShareController {
  constructor(
    private readonly auth: AuthorizationService,
    private readonly shares: EmployeeShareService,
  ) {}

  @Get()
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.shares.list(await this.auth.require(authorization, 'task.read', tenant)),
      meta: { requestId },
      error: null,
    };
  }

  @Post()
  async create(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.shares.create(
        await this.auth.require(authorization, 'task.manage', tenant),
        body,
        key ?? '',
        requestId,
      ),
      meta: { requestId },
      error: null,
    };
  }

  @Post(':id/revoke')
  async revoke(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return {
      data: await this.shares.revoke(
        await this.auth.require(authorization, 'task.manage', tenant),
        id,
        body,
        requestId,
      ),
      meta: { requestId },
      error: null,
    };
  }
}

@Controller('api/v1/public/share-codes')
export class PublicShareCodeController {
  constructor(private readonly shares: EmployeeShareService) {}

  @Post(':code/open')
  async open(@Param('code') code: string) {
    return { data: await this.shares.open(code), meta: { public: true }, error: null };
  }
}
