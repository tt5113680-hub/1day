import { createDatabase, destroyDatabase } from './client.js';
import { migrateDown, migrateToLatest } from './migrator.js';
import { seedFoundationData } from './seeds/foundation.js';
import { createTestDatabaseUrl } from './test-database.js';

function databaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error('DATABASE_URL is required.');
  return value;
}

export async function runCli(command: string | undefined): Promise<void> {
  if (command === 'test:prepare') {
    console.log(await createTestDatabaseUrl(databaseUrl()));
    return;
  }

  const database = createDatabase(databaseUrl());
  try {
    if (command === 'migrate' || command === 'repair') {
      console.log((await migrateToLatest(database)).join(', ') || 'database is up to date');
      return;
    }
    if (command === 'down') {
      console.log((await migrateDown(database)).join(', ') || 'no migration to roll back');
      return;
    }
    if (command === 'seed') {
      await migrateToLatest(database);
      await seedFoundationData(database);
      console.log('foundation seed applied');
      return;
    }
    throw new Error(`Unsupported database command: ${command ?? '(missing)'}`);
  } finally {
    await destroyDatabase(database);
  }
}

void runCli(process.argv[2]).catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
