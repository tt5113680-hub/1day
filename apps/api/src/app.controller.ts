import { Controller, Get } from '@nestjs/common';

@Controller('api/v1/health')
export class AppController {
  @Get()
  health() {
    return { status: 'ok', service: 'oneday-api' };
  }
}
