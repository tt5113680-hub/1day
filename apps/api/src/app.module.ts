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
import { RbacController } from './rbac.controller';
import { RbacService } from './rbac.service';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { AttributionController } from './attribution.controller';
import { AttributionService } from './attribution.service';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { ResultEvidenceController } from './result-evidence.controller';
import { ResultEvidenceService } from './result-evidence.service';

@Module({
  controllers: [
    AppController,
    AuthController,
    OrganizationController,
    EmployeeController,
    RbacController,
    CustomerController,
    AttributionController,
    TaskController,
    ResultEvidenceController,
  ],
  providers: [
    AuthService,
    TenantContextService,
    AuthorizationService,
    OrganizationService,
    EmployeeService,
    RbacService,
    CustomerService,
    AttributionService,
    TaskService,
    ResultEvidenceService,
  ],
})
export class AppModule {}
