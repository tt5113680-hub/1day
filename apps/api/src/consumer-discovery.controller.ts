import { Controller, Get, Query } from '@nestjs/common';
import { ConsumerDiscoveryService } from './consumer-discovery.service';

@Controller('api/v1/consumer')
export class ConsumerDiscoveryController {
  constructor(private readonly discovery: ConsumerDiscoveryService) {}
  @Get('discovery')
  async get(
    @Query('tenant') tenant: string | undefined,
    @Query('latitude') latitude: string | undefined,
    @Query('longitude') longitude: string | undefined,
  ) {
    return {
      data: await this.discovery.discovery(tenant ?? '', latitude, longitude),
      meta: { public: true },
      error: null,
    };
  }
}
