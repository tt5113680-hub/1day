import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TenantContextService } from './tenant-context.service';

@Module({
  controllers: [AppController, AuthController],
  providers: [AuthService, TenantContextService],
})
export class AppModule {}
