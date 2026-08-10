import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { CircleMerchantService } from './circle-merchant.service';
import { DataScopeService } from './data-scope.service';

@Controller('api/v1/circle/merchants')
export class CircleMerchantController {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly merchants: CircleMerchantService,
    private readonly dataScopes: DataScopeService,
  ) {}

  private async circleOperator(
    authorization: string | undefined,
    write: boolean,
  ) {
    const context = await this.authorization.requirePlatformAny(
      authorization,
      write
        ? ['circle.manage', 'platform.manage']
        : ['circle.manage', 'platform.read', 'platform.manage'],
    );
    const permissionCodes = await this.dataScopes.permissionCodes(
      context.tenantId,
      context.userId,
    );
    return { context, permissionCodes };
  }

  private async requireCircleScope(
    tenantId: string,
    userId: string,
    circleId: string,
    permissionCodes: string[],
  ) {
    await this.dataScopes.requireNetworkWriteScope(
      tenantId,
      userId,
      'circle',
      circleId,
      permissionCodes,
    );
  }

  private async requireMembershipCircleScope(
    tenantId: string,
    userId: string,
    membershipId: string,
    permissionCodes: string[],
  ) {
    const circleId = await this.dataScopes.circleIdForMerchantMembership(tenantId, membershipId);
    if (!circleId) throw new BadRequestException('VALIDATION_ERROR');
    await this.requireCircleScope(tenantId, userId, circleId, permissionCodes);
  }

  @Get()
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const { context, permissionCodes } = await this.circleOperator(authorization, false);
    const circleIds = await this.dataScopes.networkListIds(
      context.tenantId,
      context.userId,
      'circle',
      permissionCodes,
    );
    return {
      data: await this.merchants.list(context.tenantId, circleIds),
      meta: { requestId },
      error: null,
    };
  }

  @Post('invitations')
  async invite(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const { context, permissionCodes } = await this.circleOperator(authorization, true);
    const circleId = typeof body.circleId === 'string' ? body.circleId : '';
    await this.requireCircleScope(context.tenantId, context.userId, circleId, permissionCodes);
    return {
      data: await this.merchants.invite(context, body, key ?? '', requestId),
      meta: { requestId },
      error: null,
    };
  }

  @Post(':id/circle-approve')
  async circleApprove(
    @Param('id') id: string,
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const { context, permissionCodes } = await this.circleOperator(authorization, true);
    await this.requireMembershipCircleScope(
      context.tenantId,
      context.userId,
      id,
      permissionCodes,
    );
    return {
      data: await this.merchants.circleApprove(context, id, body, key ?? '', requestId),
      meta: { requestId },
      error: null,
    };
  }

  @Post(':id/platform-approve')
  async platformApprove(
    @Param('id') id: string,
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const context = await this.authorization.requirePlatform(authorization, 'platform.manage');
    return {
      data: await this.merchants.platformApprove(context, id, body, key ?? '', requestId),
      meta: { requestId },
      error: null,
    };
  }

  @Put(':id/display')
  async display(
    @Param('id') id: string,
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const { context, permissionCodes } = await this.circleOperator(authorization, true);
    await this.requireMembershipCircleScope(
      context.tenantId,
      context.userId,
      id,
      permissionCodes,
    );
    return {
      data: await this.merchants.display(context, id, body, key ?? '', requestId),
      meta: { requestId },
      error: null,
    };
  }

  @Post(':id/exit')
  async exit(
    @Param('id') id: string,
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const { context, permissionCodes } = await this.circleOperator(authorization, true);
    await this.requireMembershipCircleScope(
      context.tenantId,
      context.userId,
      id,
      permissionCodes,
    );
    return {
      data: await this.merchants.exit(context, id, body, key ?? '', requestId),
      meta: { requestId },
      error: null,
    };
  }
}
