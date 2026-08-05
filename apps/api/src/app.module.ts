import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TenantContextService } from './tenant-context.service';
import { AuthorizationService } from './authorization.service';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';
import { EmployeeController } from './employee.controller';
import { EmployeeService } from './employee.service';

@Module({
  controllers: [AppController, AuthController, OrganizationController, EmployeeController],
  providers: [
    AuthService,
    TenantContextService,
    AuthorizationService,
    OrganizationService,
    EmployeeService,
  ],
})
export class AppModule {}
