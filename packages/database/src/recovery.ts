import { Pool } from 'pg';

const SAFE_DATABASE = /^oneday(?:_v3)?_test(?:_[a-z0-9_]+)?$/;
const SNAPSHOT_TABLES = [
  'tenants',
  'tenant_operating_settings',
  'connector_configs',
  'evidence_files',
] as const;

function databaseName(connectionString: string) {
  const name = decodeURIComponent(new URL(connectionString).pathname.slice(1));
  if (!SAFE_DATABASE.test(name)) throw new Error(`Unsafe recovery source database: ${name}`);
  return name;
}

function identifier(value: string) {
  if (!SAFE_DATABASE.test(value)) throw new Error(`Unsafe recovery target database: ${value}`);
  return `"${value}"`;
}

function tableIdentifier(value: (typeof SNAPSHOT_TABLES)[number]) {
  return `"${value}"`;
}

async function counts(connectionString: string) {
  const pool = new Pool({ connectionString });
  try {
    const result: Record<string, number> = {};
    for (const table of SNAPSHOT_TABLES) {
      const row = await pool.query(`select count(*)::int as count from ${tableIdentifier(table)}`);
      result[table] = row.rows[0]?.count ?? 0;
    }
    return result;
  } finally {
    await pool.end();
  }
}

export async function createRecoverySnapshot(
  sourceConnectionString: string,
  targetDatabase: string,
) {
  const sourceDatabase = databaseName(sourceConnectionString);
  if (targetDatabase === sourceDatabase)
    throw new Error('Recovery target must differ from source.');
  const sourceCounts = await counts(sourceConnectionString);
  const adminUrl = new URL(sourceConnectionString);
  adminUrl.pathname = '/postgres';
  const admin = new Pool({ connectionString: adminUrl.toString() });
  try {
    const existing = await admin.query('select 1 from pg_database where datname=$1', [
      targetDatabase,
    ]);
    if (existing.rowCount) throw new Error(`Recovery target already exists: ${targetDatabase}`);
    await admin.query(
      `create database ${identifier(targetDatabase)} template ${identifier(sourceDatabase)}`,
    );
  } finally {
    await admin.end();
  }
  const targetUrl = new URL(sourceConnectionString);
  targetUrl.pathname = `/${targetDatabase}`;
  const restoredCounts = await counts(targetUrl.toString());
  for (const table of SNAPSHOT_TABLES) {
    if (sourceCounts[table] !== restoredCounts[table])
      throw new Error(`Recovery count mismatch for ${table}`);
  }
  return { sourceDatabase, targetDatabase, tables: sourceCounts };
}
