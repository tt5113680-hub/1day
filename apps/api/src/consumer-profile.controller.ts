import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { ConsumerProfileService } from './consumer-profile.service';
@Controller('api/v1/consumer/profile')
export class ConsumerProfileController {
  constructor(private readonly profiles: ConsumerProfileService) {}
  @Get(':id') async profile(
    @Param('id') id: string,
    @Query('tenant') tenant: string | undefined,
    @Query('access') access: string | undefined,
  ) {
    return {
      data: await this.profiles.profile(tenant ?? '', id, access ?? ''),
      meta: { public: true },
      error: null,
    };
  }
  @Post(':id/consent/revoke') async revoke(
    @Param('id') id: string,
    @Query('tenant') tenant: string | undefined,
    @Query('access') access: string | undefined,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    return {
      data: await this.profiles.revoke(tenant ?? '', id, access ?? '', key ?? '', body.version),
      meta: { public: true },
      error: null,
    };
  }
}
