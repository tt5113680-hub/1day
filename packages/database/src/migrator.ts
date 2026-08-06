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
