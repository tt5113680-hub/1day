import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Headers,
  Param,
  Post,
} from '@nestjs/common';
import { AuthService } from './auth.service';

const bearer = (value?: string) => (value?.startsWith('Bearer ') ? value.slice(7) : '');
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('login') login(
    @Body() body: { email?: string; password?: string; tenantId?: string; deviceName?: string },
  ) {
    if (!body.email || !body.password || !body.tenantId)
      throw new BadRequestException('VALIDATION_ERROR');
    return this.auth.login(body.email, body.password, body.tenantId, body.deviceName);
  }
  @Post('refresh') refresh(@Body() body: { refreshToken?: string }) {
    if (!body.refreshToken) throw new BadRequestException('VALIDATION_ERROR');
    return this.auth.refresh(body.refreshToken);
  }
  @Post('logout') logout(@Headers('authorization') authorization?: string) {
    return this.auth.revoke(bearer(authorization));
  }
  @Delete('sessions/:id') revoke(
    @Headers('authorization') authorization?: string,
    @Param('id') id?: string,
  ) {
    return this.auth.revoke(bearer(authorization), id);
  }
}
