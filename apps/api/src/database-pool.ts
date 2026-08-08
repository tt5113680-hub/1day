import { Pool, type PoolConfig } from 'pg';

let sharedPool: Pool | null = null;
let closeSharedPool: (() => Promise<void>) | null = null;

export function createApiPool(config: PoolConfig = {}): Pool {
  if (sharedPool) return sharedPool;
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DATABASE_POOL_MAX ?? 12),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 3_000,
    ...config,
  });
  closeSharedPool = pool.end.bind(pool);
  // Services retain legacy lifecycle hooks. Pool ownership is centralized at application root,
  // so individual hook calls must not close a pool that other services are still using.
  pool.end = async () => undefined;
  sharedPool = pool;
  return pool;
}

export async function destroyApiPool(): Promise<void> {
  const close = closeSharedPool;
  sharedPool = null;
  closeSharedPool = null;
  if (close) await close();
}
