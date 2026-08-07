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

@Controller('api/v1/circle/merchants')
export class CircleMerchantController {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly merchants: CircleMerchantService,
  ) {}

  @Get()
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const context = await this.authorization.requirePlatform(authorization, 'circle.manage');
    return { data: await this.merchants.list(context.tenantId), meta: { requestId }, error: null };
  }

  @Post('invitations')
  async invite(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const context = await this.authorization.requirePlatform(authorization, 'circle.manage');
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
    const context = await this.authorization.requirePlatform(authorization, 'circle.manage');
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
    const context = await this.authorization.requirePlatform(authorization, 'circle.manage');
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
    const context = await this.authorization.requirePlatform(authorization, 'circle.manage');
    return {
      data: await this.merchants.exit(context, id, body, key ?? '', requestId),
      meta: { requestId },
      error: null,
    };
  }
}
