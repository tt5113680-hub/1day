import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import {
  createSyncNotificationHandler,
  OutboxDispatcher,
  TaskDispatchScheduler,
} from '@oneday/events';

const { Client } = createRequire(
  fileURLToPath(new URL('../../packages/events/package.json', import.meta.url)),
)('pg');

export const workerServiceName = 'oneday-worker';

const port = Number(process.env.HEALTH_PORT ?? 3002);
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');
const intervalMs = Math.max(1_000, Number(process.env.WORKER_POLL_INTERVAL_MS ?? 5_000));
const tenantScope = process.env.WORKER_TENANT_ID;
const outbox = new OutboxDispatcher(
  databaseUrl,
  'oneday-worker.internal',
  createSyncNotificationHandler(databaseUrl),
  tenantScope,
);
const scheduler = new TaskDispatchScheduler(databaseUrl);
let running = false;
let lastRun: {
  at: string;
  reminders: number;
  overdue: number;
  published: number;
  retried: number;
  deadLetter: number;
} | null = null;
let lastError: string | null = null;

const server = createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(
      JSON.stringify({
        status: lastError ? 'degraded' : 'ok',
        service: workerServiceName,
        running,
        lastRun,
        lastError,
      }),
    );
    return;
  }

  response.writeHead(404, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ status: 'not_found' }));
});

async function persistHeartbeat() {
  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    await client.query(
      `insert into worker_heartbeats(id,service_name,status,last_run_at,last_error,payload,created_by,updated_by)
       values($1,$2,$3,now(),$4,$5::jsonb,null,null)
       on conflict (service_name) do update
       set status=excluded.status,
           last_run_at=excluded.last_run_at,
           last_error=excluded.last_error,
           payload=excluded.payload,
           updated_at=now(),
           deleted_at=null,
           version=worker_heartbeats.version+1`,
      [
        randomUUID(),
        workerServiceName,
        lastError ? 'degraded' : 'ok',
        lastError,
        JSON.stringify({ lastRun }),
      ],
    );
  } catch {
    // Heartbeat persistence must not crash the worker loop; health HTTP still reports.
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function tick() {
  if (running) return;
  running = true;
  try {
    const correlationId = randomUUID();
    const tasks = await scheduler.dispatch({
      tenantId: tenantScope,
      correlationId,
      traceId: 'worker.task-dispatch',
    });
    const events = await outbox.dispatch();
    lastRun = {
      at: new Date().toISOString(),
      ...tasks,
      published: events.published,
      retried: events.retried,
      deadLetter: events.deadLetter,
    };
    lastError = null;
  } catch (error) {
    lastError = error instanceof Error ? error.message : 'worker dispatch failed';
  } finally {
    running = false;
    await persistHeartbeat();
  }
}

server.listen(port, '0.0.0.0');
void tick();
const timer = setInterval(() => void tick(), intervalMs);
const shutdown = async () => {
  clearInterval(timer);
  server.close();
  await Promise.all([outbox.close(), scheduler.close()]);
};
process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());
