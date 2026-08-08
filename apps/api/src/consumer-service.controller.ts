import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { ConsumerStoreService } from './consumer-store.service';

@Controller('api/v1/consumer/services')
export class ConsumerServiceController {
  constructor(private readonly stores: ConsumerStoreService) {}
  @Get(':id')
  async detail(@Param('id') id: string, @Query('tenant') tenant: string | undefined) {
    return {
      data: await this.stores.serviceDetail(tenant ?? '', id),
      meta: { public: true },
      error: null,
    };
  }
  @Post(':serviceId/actions/:actionId/open')
  async open(
    @Param('serviceId') serviceId: string,
    @Param('actionId') actionId: string,
    @Query('tenant') tenant: string | undefined,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    const detail = await this.stores.serviceDetail(tenant ?? '', serviceId);
    return {
      data: await this.stores.open(tenant ?? '', detail.store.id, actionId, key ?? '', body),
      meta: { public: true },
      error: null,
    };
  }
}
