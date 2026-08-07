import { BadRequestException, Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { ManagementAiSuggestionService } from './management-ai-suggestion.service';
@Controller('api/v1/management/ai-suggestions')
export class ManagementAiSuggestionController {
  constructor(
    private readonly auth: AuthorizationService,
    private readonly suggestions: ManagementAiSuggestionService,
  ) {}
  private async context(a: string | undefined, t: string | undefined, r: string | undefined) {
    if (!r?.trim()) throw new BadRequestException('VALIDATION_ERROR');
    return this.auth.require(a, 'tenant.manage', t);
  }
  @Get() async list(
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
  ) {
    const c = await this.context(a, t, r);
    return { data: await this.suggestions.list(c), meta: { requestId: r }, error: null };
  }
  @Post(':id/accept') async accept(
    @Param('id') id: string,
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Body() b: Record<string, unknown>,
  ) {
    const c = await this.context(a, t, r);
    return {
      data: await this.suggestions.accept(c, id, b, r!),
      meta: { requestId: r },
      error: null,
    };
  }
  @Post(':id/feedback') async feedback(
    @Param('id') id: string,
    @Headers('authorization') a: string | undefined,
    @Headers('x-tenant-context') t: string | undefined,
    @Headers('x-request-id') r: string | undefined,
    @Body() b: Record<string, unknown>,
  ) {
    const c = await this.context(a, t, r);
    return {
      data: await this.suggestions.feedback(c, id, b, r!),
      meta: { requestId: r },
      error: null,
    };
  }
}
