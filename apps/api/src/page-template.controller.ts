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
import { PageTemplateService } from './page-template.service';
const meta = (r?: string) => {
  if (!r?.trim()) throw new BadRequestException('VALIDATION_ERROR');
  return { requestId: r };
};
@Controller('api/v1/page-templates')
export class PageTemplateController {
  constructor(
    private readonly auth: AuthorizationService,
    private readonly templates: PageTemplateService,
  ) {}
  @Get() async list(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
  ) {
    const c = await this.auth.require(a, 'page.read', t);
    return { data: await this.templates.list(c), meta: meta(r), error: null };
  }
  @Post() async create(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Headers('idempotency-key') k: string | undefined,
    @Body() b: Record<string, unknown>,
  ) {
    const c = await this.auth.require(a, 'page.manage', t),
      m = meta(r);
    return { data: await this.templates.create(c, b, k ?? '', m.requestId), meta: m, error: null };
  }
  @Get(':id/preview') async preview(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Param('id') id: string,
    @Query('versionId') v: string | undefined,
  ) {
    const c = await this.auth.require(a, 'page.read', t);
    return { data: await this.templates.preview(c, id, v), meta: meta(r), error: null };
  }
  @Post(':id/publish') async publish(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Param('id') id: string,
    @Body() b: Record<string, unknown>,
  ) {
    const c = await this.auth.require(a, 'page.manage', t),
      m = meta(r);
    return { data: await this.templates.publish(c, id, b, m.requestId), meta: m, error: null };
  }
  @Post(':id/rollback') async rollback(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Param('id') id: string,
    @Body() b: Record<string, unknown>,
  ) {
    const c = await this.auth.require(a, 'page.manage', t),
      m = meta(r);
    return { data: await this.templates.rollback(c, id, b, m.requestId), meta: m, error: null };
  }
  @Post(':id/drafts') async draft(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Param('id') id: string,
    @Body() b: Record<string, unknown>,
  ) {
    const c = await this.auth.require(a, 'page.manage', t),
      m = meta(r);
    return {
      data: await this.templates.draft(c, id, String(b.sourceVersionId), m.requestId),
      meta: m,
      error: null,
    };
  }
  @Put(':id/drafts/:versionId') async updateDraft(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Body() b: Record<string, unknown>,
  ) {
    const c = await this.auth.require(a, 'page.manage', t),
      m = meta(r);
    return {
      data: await this.templates.updateDraft(c, id, versionId, b, m.requestId),
      meta: m,
      error: null,
    };
  }
  @Post(':id/preview-link') async previewLink(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Param('id') id: string,
    @Body() b: Record<string, unknown>,
  ) {
    const c = await this.auth.require(a, 'page.read', t),
      m = meta(r);
    return {
      data: await this.templates.previewLink(c, id, b, m.requestId),
      meta: m,
      error: null,
    };
  }
}
