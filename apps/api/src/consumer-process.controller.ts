import { Controller, Get, Param, Query } from '@nestjs/common';
import { ConsumerProcessService } from './consumer-process.service';

@Controller('api/v1/consumer/processes')
export class ConsumerProcessController {
  constructor(private readonly processes: ConsumerProcessService) {}

  @Get(':id')
  async detail(
    @Param('id') id: string,
    @Query('tenant') tenant: string | undefined,
    @Query('access') access: string | undefined,
  ) {
    return {
      data: await this.processes.detail(tenant ?? '', id, access ?? ''),
      meta: { public: true },
      error: null,
    };
  }
}
