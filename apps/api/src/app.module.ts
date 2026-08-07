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
import { PageTemplateController } from './page-template.controller';
import { PageTemplateService } from './page-template.service';
import { ExternalActionController } from './external-action.controller';
import { ExternalActionService } from './external-action.service';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';
import { ManagementWorkflowController } from './management-workflow.controller';
import { ConsumerEntryController } from './consumer-entry.controller';
import { ConsumerEntryService } from './consumer-entry.service';
import { ConsumerDiscoveryController } from './consumer-discovery.controller';
import { ConsumerDiscoveryService } from './consumer-discovery.service';
import { ConsumerStoreController } from './consumer-store.controller';
import { ConsumerStoreService } from './consumer-store.service';
import { ConsumerServiceController } from './consumer-service.controller';
import { ConsumerActionController } from './consumer-action.controller';
import { ConsumerActionService } from './consumer-action.service';
import { ConsumerProcessController } from './consumer-process.controller';
import { ConsumerProcessService } from './consumer-process.service';
import { ConsumerProfileController } from './consumer-profile.controller';
import { ConsumerProfileService } from './consumer-profile.service';
import { EmployeeWorkbenchController } from './employee-workbench.controller';
import { EmployeeWorkbenchService } from './employee-workbench.service';
import { EmployeeTaskDetailController } from './employee-task-detail.controller';
import { EmployeeTaskDetailService } from './employee-task-detail.service';
import { EmployeeCustomerDetailController } from './employee-customer-detail.controller';
import { EmployeeCustomerDetailService } from './employee-customer-detail.service';
import { EmployeeFollowUpController } from './employee-follow-up.controller';
import { EmployeeFollowUpService } from './employee-follow-up.service';
import { EmployeeShareController, PublicShareCodeController } from './employee-share.controller';
import { EmployeeShareService } from './employee-share.service';
import { EmployeeLeadPoolController } from './employee-lead-pool.controller';
import { EmployeeLeadPoolService } from './employee-lead-pool.service';
import { EmployeeNurtureController } from './employee-nurture.controller';
import { EmployeeNurtureService } from './employee-nurture.service';
import { EmployeeNotificationController } from './employee-notification.controller';
import { EmployeeNotificationService } from './employee-notification.service';
import { EmployeeProfileController } from './employee-profile.controller';
import { EmployeeProfileService } from './employee-profile.service';
import { ManagementDashboardController } from './management-dashboard.controller';
import { ManagementDashboardService } from './management-dashboard.service';
import { ManagementFunnelController } from './management-funnel.controller';
import { ManagementFunnelService } from './management-funnel.service';
import { ManagementCustomerAssetsController } from './management-customer-assets.controller';
import { ManagementCustomerAssetsService } from './management-customer-assets.service';
import { ManagementAiSuggestionController } from './management-ai-suggestion.controller';
import { ManagementAiSuggestionService } from './management-ai-suggestion.service';
import { ManagementStoreController } from './management-store.controller';
import { ManagementStoreService } from './management-store.service';
import { ManagementOrganizationEmployeeController } from './management-organization-employee.controller';
import { ManagementOrganizationEmployeeService } from './management-organization-employee.service';
import { ManagementRolePermissionController } from './management-role-permission.controller';
import { ManagementRolePermissionService } from './management-role-permission.service';
import { ManagementPermissionAuditController } from './management-permission-audit.controller';
import { ManagementPermissionAuditService } from './management-permission-audit.service';
import { ManagementEmployeePerformanceController } from './management-employee-performance.controller';
import { ManagementEmployeePerformanceService } from './management-employee-performance.service';
import { ManagementAttributionController } from './management-attribution.controller';
import { ManagementAttributionService } from './management-attribution.service';
import { ManagementContentController } from './management-content.controller';
import { ManagementContentService } from './management-content.service';
import { ManagementConnectorController } from './management-connector.controller';
import { ManagementConnectorService } from './management-connector.service';
import { ManagementSettingsController } from './management-settings.controller';
import { ManagementSettingsService } from './management-settings.service';
import { PlatformDashboardController } from './platform-dashboard.controller';
import { PlatformDashboardService } from './platform-dashboard.service';
import { PlatformChannelController } from './platform-channel.controller';
import { PlatformChannelService } from './platform-channel.service';
import { PlatformTenantController } from './platform-tenant.controller';
import { PlatformTenantService } from './platform-tenant.service';
import { PlatformOnboardingController } from './platform-onboarding.controller';
import { PlatformOnboardingService } from './platform-onboarding.service';

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
    PageTemplateController,
    ExternalActionController,
    WorkflowController,
    ManagementWorkflowController,
    ConsumerEntryController,
    ConsumerDiscoveryController,
    ConsumerStoreController,
    ConsumerServiceController,
    ConsumerActionController,
    ConsumerProcessController,
    ConsumerProfileController,
    EmployeeWorkbenchController,
    EmployeeTaskDetailController,
    EmployeeCustomerDetailController,
    EmployeeFollowUpController,
    EmployeeShareController,
    PublicShareCodeController,
    EmployeeLeadPoolController,
    EmployeeNurtureController,
    EmployeeNotificationController,
    EmployeeProfileController,
    ManagementDashboardController,
    ManagementFunnelController,
    ManagementCustomerAssetsController,
    ManagementAiSuggestionController,
    ManagementStoreController,
    ManagementOrganizationEmployeeController,
    ManagementRolePermissionController,
    ManagementPermissionAuditController,
    ManagementEmployeePerformanceController,
    ManagementAttributionController,
    ManagementContentController,
    ManagementConnectorController,
    ManagementSettingsController,
    PlatformDashboardController,
    PlatformChannelController,
    PlatformTenantController,
    PlatformOnboardingController,
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
    PageTemplateService,
    ExternalActionService,
    WorkflowService,
    ConsumerEntryService,
    ConsumerDiscoveryService,
    ConsumerStoreService,
    ConsumerActionService,
    ConsumerProcessService,
    ConsumerProfileService,
    EmployeeWorkbenchService,
    EmployeeTaskDetailService,
    EmployeeCustomerDetailService,
    EmployeeFollowUpService,
    EmployeeShareService,
    EmployeeLeadPoolService,
    EmployeeNurtureService,
    EmployeeNotificationService,
    EmployeeProfileService,
    ManagementDashboardService,
    ManagementFunnelService,
    ManagementCustomerAssetsService,
    ManagementAiSuggestionService,
    ManagementStoreService,
    ManagementOrganizationEmployeeService,
    ManagementRolePermissionService,
    ManagementPermissionAuditService,
    ManagementEmployeePerformanceService,
    ManagementAttributionService,
    ManagementContentService,
    ManagementConnectorService,
    ManagementSettingsService,
    PlatformDashboardService,
    PlatformChannelService,
    PlatformTenantService,
    PlatformOnboardingService,
  ],
})
export class AppModule {}
