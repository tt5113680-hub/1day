import { Controller, Get, Query } from '@nestjs/common';
import { ConsumerEntryService } from './consumer-entry.service';

@Controller('api/v1/consumer')
export class ConsumerEntryController {
  constructor(private readonly consumerEntry: ConsumerEntryService) {}

  @Get('entry')
  async entry(@Query('tenant') tenant: string | undefined) {
    return {
      data: await this.consumerEntry.entry(tenant ?? ''),
      meta: { public: true },
      error: null,
    };
  }
}
