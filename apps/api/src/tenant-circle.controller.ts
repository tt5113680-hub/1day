import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { TenantCircleService } from './tenant-circle.service';

@Controller('api/v1')
export class TenantCircleController {
  constructor(
    private readonly circles: TenantCircleService,
    private readonly auth: AuthorizationService,
  ) {}

  /** Consumer standalone circle list (LBS + public_visible). */
  @Get('consumer/circles')
  async listPublic(
    @Query('tenant') tenant: string | undefined,
    @Query('latitude') latitude: string | undefined,
    @Query('longitude') longitude: string | undefined,
  ) {
    return {
      data: await this.circles.listPublic(tenant ?? '', latitude, longitude),
      meta: { public: true },
      error: null,
    };
  }

  @Get('consumer/circles/:id')
  async detailPublic(
    @Param('id') id: string,
    @Query('tenant') tenant: string | undefined,
  ) {
    return {
      data: await this.circles.detailPublic(tenant ?? '', id),
      meta: { public: true },
      error: null,
    };
  }

  /** Operator: my circles + nearby circles to join. */
  @Get('management/circles')
  async listOwned(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const context = await this.auth.require(authorization, 'tenant.manage', tenant);
    return {
      data: await this.circles.listOwned(context),
      meta: { requestId },
      error: null,
    };
  }

  @Post('management/circles')
  async create(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const context = await this.auth.require(authorization, 'tenant.manage', tenant);
    return {
      data: await this.circles.create(context, body ?? {}),
      meta: { requestId },
      error: null,
    };
  }

  @Put('management/circles/:id')
  async update(
    @Param('id') id: string,
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const context = await this.auth.require(authorization, 'tenant.manage', tenant);
    return {
      data: await this.circles.update(context, id, body ?? {}),
      meta: { requestId },
      error: null,
    };
  }

  @Post('management/circles/invite')
  async invite(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const context = await this.auth.require(authorization, 'tenant.manage', tenant);
    return {
      data: await this.circles.invite(context, body ?? {}),
      meta: { requestId },
      error: null,
    };
  }

  @Post('management/circles/apply')
  async apply(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const context = await this.auth.require(authorization, 'tenant.manage', tenant);
    return {
      data: await this.circles.apply(context, body ?? {}),
      meta: { requestId },
      error: null,
    };
  }

  @Get('management/circles/applications')
  async applications(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const context = await this.auth.require(authorization, 'tenant.manage', tenant);
    return {
      data: await this.circles.listApplications(context),
      meta: { requestId },
      error: null,
    };
  }

  @Post('management/circles/applications/:id/decide')
  async decide(
    @Param('id') id: string,
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-context') tenant: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    const context = await this.auth.require(authorization, 'tenant.manage', tenant);
    return {
      data: await this.circles.decide(context, id, body ?? {}),
      meta: { requestId },
      error: null,
    };
  }
}
