import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { MembershipCommercialService } from './membership-commercial.service';

@Controller('api/v1')
export class MembershipCommercialController {
  constructor(
    private readonly auth: AuthorizationService,
    private readonly memberships: MembershipCommercialService,
  ) {}
  private async context(
    authorization?: string,
    tenant?: string,
    requestId?: string,
    permission = 'tenant.manage',
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return this.auth.require(authorization, permission, tenant);
  }
  @Post('consumer/memberships/enroll') async enroll(
    @Query('tenant') tenant: string | undefined,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    return {
      data: await this.memberships.enroll(tenant ?? '', body, key ?? ''),
      meta: { public: true },
      error: null,
    };
  }
  @Get('consumer/memberships/wallet') async wallet(
    @Query('tenant') tenant: string | undefined,
    @Query('accessId') accessId: string | undefined,
    @Query('access') access: string | undefined,
  ) {
    return {
      data: await this.memberships.wallet(tenant ?? '', accessId ?? '', access ?? ''),
      meta: { public: true },
      error: null,
    };
  }
  @Get('management/memberships') async list(
    @Headers('authorization') a?: string,
    @Headers('x-tenant-context') t?: string,
    @Headers('x-request-id') r?: string,
  ) {
    return {
      data: await this.memberships.list(await this.context(a, t, r)),
      meta: { requestId: r },
      error: null,
    };
  }
  @Post('management/memberships/:id/grants') async grant(
    @Param('id') id: string,
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    return {
      data: await this.memberships.grant(await this.context(a, t, r), id, body, key ?? ''),
      meta: { requestId: r },
      error: null,
    };
  }
  @Post('employee/memberships/redeem') async redeem(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    return {
      data: await this.memberships.redeem(
        await this.context(a, t, r, 'task.manage'),
        body,
        key ?? '',
      ),
      meta: { requestId: r },
      error: null,
    };
  }
  @Get('employee/memberships/benefits') async employeeBenefits(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
  ) {
    return {
      data: await this.memberships.benefits(await this.context(a, t, r, 'task.read')),
      meta: { requestId: r },
      error: null,
    };
  }
}
