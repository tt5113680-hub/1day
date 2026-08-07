import { Controller, Get, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { Pool } from 'pg';

@Controller('api/v1/health')
export class AppController implements OnModuleDestroy {
  private readonly pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 1_500,
    query_timeout: 1_500,
  });

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
    await this.pool.end();
  }
}
