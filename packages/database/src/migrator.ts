import { Migrator, type Kysely, type Migration, type MigrationProvider } from 'kysely';
import * as foundationSchema from './migrations/001_foundation_schema.js';
import * as authSessions from './migrations/002_auth_sessions.js';
import * as membershipRoles from './migrations/003_membership_roles.js';
import * as eventConsumptions from './migrations/004_event_consumptions.js';
import * as organizationModel from './migrations/005_organization_model.js';
import * as employeeMembership from './migrations/006_employee_membership.js';
import * as permissionConfirmations from './migrations/007_permission_change_confirmations.js';
import * as customerMaster from './migrations/008_customer_master.js';
import * as customerAttribution from './migrations/009_customer_attribution.js';
import * as taskReminders from './migrations/010_task_reminders.js';
import * as taskNotificationPreferences from './migrations/011_task_notification_preferences.js';
import * as resultEvidence from './migrations/012_result_evidence.js';
import * as pageTemplates from './migrations/013_page_templates.js';
import * as externalActions from './migrations/014_external_actions.js';
import * as workflows from './migrations/015_workflows.js';
import * as consumerDiscovery from './migrations/016_consumer_discovery.js';
import * as consumerStoreDetails from './migrations/017_consumer_store_details.js';
import * as consumerActionRedirects from './migrations/018_consumer_action_redirects.js';
import * as consumerProcessAccess from './migrations/019_consumer_process_access.js';
import * as consumerProfileAccess from './migrations/020_consumer_profile_access.js';
import * as taskDetailContext from './migrations/021_task_detail_context.js';
import * as customerTags from './migrations/022_customer_tags.js';
import * as taskFollowUps from './migrations/023_task_follow_ups.js';
import * as employeeShareCodes from './migrations/024_employee_share_codes.js';
import * as employeeLeadPool from './migrations/025_employee_lead_pool.js';
import * as employeeNurture from './migrations/026_employee_nurture.js';
import * as employeeNotifications from './migrations/027_employee_notifications.js';
import * as customerExportRequests from './migrations/028_customer_export_requests.js';
import * as aiSuggestions from './migrations/029_ai_suggestions.js';
import * as storeManagement from './migrations/030_store_management.js';
import * as contentCenter from './migrations/031_content_center.js';
import * as connectorConfigs from './migrations/032_connector_configs.js';
import * as tenantOperatingSettings from './migrations/033_tenant_operating_settings.js';
import * as platformTenantSettings from './migrations/034_platform_tenant_settings.js';
import * as platformChannels from './migrations/035_platform_channels.js';
import * as platformBusinessCircles from './migrations/036_platform_business_circles.js';
import * as platformTemplateIndustries from './migrations/037_platform_template_industries.js';
import * as platformConnectors from './migrations/038_platform_connectors.js';
import * as platformSecurityReviews from './migrations/039_platform_security_reviews.js';
import * as channelMerchantOnboardings from './migrations/040_channel_merchant_onboardings.js';
import * as circleMerchantManagement from './migrations/041_circle_merchant_management.js';
import * as consumerOperatingProjections from './migrations/042_consumer_operating_projections.js';
import * as workerDispatchState from './migrations/043_worker_dispatch_state.js';
import * as rateLimitWindows from './migrations/044_rate_limit_windows.js';
import * as aiSuggestionExecution from './migrations/045_ai_suggestion_execution.js';
import * as commercialStorefront from './migrations/046_commercial_storefront.js';
import * as commercialProvisioning from './migrations/048_commercial_provisioning.js';
import * as storefrontLifecycle from './migrations/049_storefront_lifecycle.js';
import * as offerOperations from './migrations/050_offer_operations.js';
import * as membershipCommercialLoop from './migrations/051_membership_commercial_loop.js';
import * as contentStorePlacements from './migrations/052_content_store_placements.js';
import * as storeServicePlatformOffers from './migrations/047_store_service_platform_offers.js';
import * as syncGateway from './migrations/053_sync_gateway.js';
import * as channelPermissions from './migrations/054_channel_permissions.js';
import * as merchantCommerce from './migrations/055_merchant_commerce.js';
import * as geoAgentTree from './migrations/056_geo_agent_tree.js';
import * as agentOperations from './migrations/057_agent_operations.js';
import * as entryFunnel from './migrations/058_entry_funnel.js';
import type { Database } from './types.js';

const migrationProvider: MigrationProvider = {
  async getMigrations(): Promise<Record<string, Migration>> {
    return {
      '001_foundation_schema': foundationSchema,
      '002_auth_sessions': authSessions,
      '003_membership_roles': membershipRoles,
      '004_event_consumptions': eventConsumptions,
      '005_organization_model': organizationModel,
      '006_employee_membership': employeeMembership,
      '007_permission_change_confirmations': permissionConfirmations,
      '008_customer_master': customerMaster,
      '009_customer_attribution': customerAttribution,
      '010_task_reminders': taskReminders,
      '011_task_notification_preferences': taskNotificationPreferences,
      '012_result_evidence': resultEvidence,
      '013_page_templates': pageTemplates,
      '014_external_actions': externalActions,
      '015_workflows': workflows,
      '016_consumer_discovery': consumerDiscovery,
      '017_consumer_store_details': consumerStoreDetails,
      '018_consumer_action_redirects': consumerActionRedirects,
      '019_consumer_process_access': consumerProcessAccess,
      '020_consumer_profile_access': consumerProfileAccess,
      '021_task_detail_context': taskDetailContext,
      '022_customer_tags': customerTags,
      '023_task_follow_ups': taskFollowUps,
      '024_employee_share_codes': employeeShareCodes,
      '025_employee_lead_pool': employeeLeadPool,
      '026_employee_nurture': employeeNurture,
      '027_employee_notifications': employeeNotifications,
      '028_customer_export_requests': customerExportRequests,
      '029_ai_suggestions': aiSuggestions,
      '030_store_management': storeManagement,
      '031_content_center': contentCenter,
      '032_connector_configs': connectorConfigs,
      '033_tenant_operating_settings': tenantOperatingSettings,
      '034_platform_tenant_settings': platformTenantSettings,
      '035_platform_channels': platformChannels,
      '036_platform_business_circles': platformBusinessCircles,
      '037_platform_template_industries': platformTemplateIndustries,
      '038_platform_connectors': platformConnectors,
      '039_platform_security_reviews': platformSecurityReviews,
      '040_channel_merchant_onboardings': channelMerchantOnboardings,
      '041_circle_merchant_management': circleMerchantManagement,
      '042_consumer_operating_projections': consumerOperatingProjections,
      '043_worker_dispatch_state': workerDispatchState,
      '044_rate_limit_windows': rateLimitWindows,
      '045_ai_suggestion_execution': aiSuggestionExecution,
      '046_commercial_storefront': commercialStorefront,
      '047_store_service_platform_offers': storeServicePlatformOffers,
      '048_commercial_provisioning': commercialProvisioning,
      '049_storefront_lifecycle': storefrontLifecycle,
      '050_offer_operations': offerOperations,
      '051_membership_commercial_loop': membershipCommercialLoop,
      '052_content_store_placements': contentStorePlacements,
      '053_sync_gateway': syncGateway,
      '054_channel_permissions': channelPermissions,
      '055_merchant_commerce': merchantCommerce,
      '056_geo_agent_tree': geoAgentTree,
      '057_agent_operations': agentOperations,
      '058_entry_funnel': entryFunnel,
    };
  },
};

function createMigrator(database: Kysely<Database>): Migrator {
  return new Migrator({ db: database, provider: migrationProvider });
}

function assertMigrationSuccess(error: unknown): void {
  if (error) throw error;
}

export async function migrateToLatest(database: Kysely<Database>): Promise<string[]> {
  const { error, results } = await createMigrator(database).migrateToLatest();
  assertMigrationSuccess(error);
  return results?.map((result) => `${result.migrationName}:${result.direction}`) ?? [];
}

export async function migrateDown(database: Kysely<Database>): Promise<string[]> {
  const { error, results } = await createMigrator(database).migrateDown();
  assertMigrationSuccess(error);
  return results?.map((result) => `${result.migrationName}:${result.direction}`) ?? [];
}
