import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { ConsumerStoreService } from './consumer-store.service';

@Controller('api/v1/consumer/stores')
export class ConsumerStoreController {
  constructor(private readonly stores: ConsumerStoreService) {}
  @Get(':id')
  async detail(
    @Param('id') id: string,
    @Query('tenant') tenant: string | undefined,
    @Query('preview') preview: string | undefined,
  ) {
    return {
      data: await this.stores.detail(tenant ?? '', id, preview),
      meta: { public: true },
      error: null,
    };
  }
  @Post(':storeId/actions/:actionId/open')
  async open(
    @Param('storeId') storeId: string,
    @Param('actionId') actionId: string,
    @Query('tenant') tenant: string | undefined,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    return {
      data: await this.stores.open(tenant ?? '', storeId, actionId, key ?? '', body),
      meta: { public: true },
      error: null,
    };
  }
  @Post(':storeId/outbound')
  async outbound(
    @Param('storeId') storeId: string,
    @Query('tenant') tenant: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    return {
      data: await this.stores.trackOutbound(tenant ?? '', storeId, body),
      meta: { public: true },
      error: null,
    };
  }
}
