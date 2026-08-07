import { createDatabase, destroyDatabase } from './client.js';
import { migrateDown, migrateToLatest } from './migrator.js';
import { seedFoundationData } from './seeds/foundation.js';
import { createTestDatabaseUrl } from './test-database.js';
import { createRecoverySnapshot } from './recovery.js';

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
  if (command === 'recovery:clone') {
    const target = process.env.ONEDAY_RECOVERY_TARGET;
    if (!target) throw new Error('ONEDAY_RECOVERY_TARGET is required.');
    console.log(JSON.stringify(await createRecoverySnapshot(databaseUrl(), target)));
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
