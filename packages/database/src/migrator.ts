import { Migrator, type Kysely, type Migration, type MigrationProvider } from 'kysely';
import * as foundationSchema from './migrations/001_foundation_schema.js';
import * as authSessions from './migrations/002_auth_sessions.js';
import * as membershipRoles from './migrations/003_membership_roles.js';
import * as eventConsumptions from './migrations/004_event_consumptions.js';
import * as organizationModel from './migrations/005_organization_model.js';
import * as employeeMembership from './migrations/006_employee_membership.js';
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
