import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import {
  createSyncNotificationHandler,
  OutboxDispatcher,
  TaskDispatchScheduler,
} from '@oneday/events';

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
  }
}
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
