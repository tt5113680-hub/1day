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
import { PageTemplateService } from './page-template.service';

const meta = (requestId?: string) => {
  if (!requestId?.trim()) throw new BadRequestException('VALIDATION_ERROR');
  return { requestId };
};

@Controller('api/v1/platform/templates')
export class PlatformTemplateController {
  constructor(
    private readonly auth: AuthorizationService,
    private readonly templates: PageTemplateService,
  ) {}

  @Get()
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
  ) {
    const context = await this.auth.requirePlatform(authorization, 'platform.read');
    return { data: await this.templates.list(context), meta: meta(requestId), error: null };
  }

  @Post()
  async create(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    if (!Object.hasOwn(body, 'industryConfig')) throw new BadRequestException('VALIDATION_ERROR');
    const context = await this.auth.requirePlatform(authorization, 'platform.manage');
    const request = meta(requestId);
    return {
      data: await this.templates.create(context, body, key ?? '', request.requestId),
      meta: request,
      error: null,
    };
  }

  @Get(':id/preview')
  async preview(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Param('id') id: string,
    @Query('versionId') versionId: string | undefined,
  ) {
    const context = await this.auth.requirePlatform(authorization, 'platform.read');
    return {
      data: await this.templates.preview(context, id, versionId),
      meta: meta(requestId),
      error: null,
    };
  }

  @Post(':id/publish')
  async publish(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const context = await this.auth.requirePlatform(authorization, 'platform.manage');
    const request = meta(requestId);
    return {
      data: await this.templates.publish(context, id, body, request.requestId),
      meta: request,
      error: null,
    };
  }
}
