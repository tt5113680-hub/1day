import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { ConsumerActionService } from './consumer-action.service';

@Controller('api/v1/consumer/actions')
export class ConsumerActionController {
  constructor(private readonly actions: ConsumerActionService) {}

  @Get(':id')
  async detail(@Param('id') id: string, @Query('tenant') tenant: string | undefined) {
    return {
      data: await this.actions.detail(tenant ?? '', id),
      meta: { public: true },
      error: null,
    };
  }

  @Post(':id/confirm')
  async confirm(
    @Param('id') id: string,
    @Query('tenant') tenant: string | undefined,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    return {
      data: await this.actions.confirm(tenant ?? '', id, key ?? '', body),
      meta: { public: true },
      error: null,
    };
  }
}
