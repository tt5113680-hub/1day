import { Controller, Get, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { createApiPool, destroyApiPool } from './database-pool';

@Controller('api/v1/health')
export class AppController implements OnModuleDestroy {
  private readonly pool = createApiPool();

  @Get()
  async health() {
    try {
      await this.pool.query('select 1');
      return { status: 'ok', service: 'oneday-api', database: 'ready' };
    } catch {
      throw new ServiceUnavailableException({
        status: 'unavailable',
        service: 'oneday-api',
        database: 'unavailable',
      });
    }
  }

  async onModuleDestroy() {
    await destroyApiPool();
  }
}
