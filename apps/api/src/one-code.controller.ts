import { Controller, Get, Param, Query } from '@nestjs/common';
import { OneCodeService } from './one-code.service';

@Controller('api/v1/one-code')
export class OneCodeController {
  constructor(private readonly oneCode: OneCodeService) {}

  @Get(':code') async resolve(@Param('code') code: string, @Query('role') role?: string) {
    return {
      data: await this.oneCode.resolve(code, role),
      meta: { public: true },
      error: null,
    };
  }
}
