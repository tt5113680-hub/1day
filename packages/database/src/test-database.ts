import { Pool } from 'pg';

const SAFE_TEST_DATABASE = /^oneday(?:_v3)?_test(?:_[a-z0-9_]+)?$/;

export async function createTestDatabaseUrl(
  connectionString: string,
  databaseName = process.env.ONEDAY_TEST_DATABASE ?? 'oneday_v3_test',
): Promise<string> {
  if (process.env.ONEDAY_ALLOW_TEST_DATABASE !== '1') {
    throw new Error('Set ONEDAY_ALLOW_TEST_DATABASE=1 before creating a test database.');
  }
  if (!SAFE_TEST_DATABASE.test(databaseName)) {
    throw new Error(`Unsafe test database name: ${databaseName}`);
  }

  const target = new URL(connectionString);
  target.pathname = `/${databaseName}`;
  const admin = new URL(connectionString);
  admin.pathname = '/postgres';
  const pool = new Pool({ connectionString: admin.toString() });
  try {
    const existing = await pool.query('select 1 from pg_database where datname = $1', [
      databaseName,
    ]);
    if (existing.rowCount === 0) {
      await pool.query(`create database "${databaseName}"`);
    }
  } finally {
    await pool.end();
  }
  return target.toString();
}
