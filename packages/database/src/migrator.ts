import { Migrator, type Kysely, type Migration, type MigrationProvider } from 'kysely';
import * as foundationSchema from './migrations/001_foundation_schema.js';
import type { Database } from './types.js';

const migrationProvider: MigrationProvider = {
  async getMigrations(): Promise<Record<string, Migration>> {
    return { '001_foundation_schema': foundationSchema };
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
