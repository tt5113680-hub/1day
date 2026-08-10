/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const base = 'http://127.0.0.1:3264';
const systemTenant = '00000000-0000-4000-8000-000000000001';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3264',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'sys-4-platform-outbox',
  },
  stdio: 'ignore',
});

async function ready() {
  for (let i = 0; i < 60; i += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      // starting
    }
    await wait(100);
  }
  throw new Error('API not ready');
}

async function login(email, password, tenantId) {
  const response = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, tenantId }),
  });
  assert.equal(response.status, 201);
  return (await response.json()).accessToken;
}

test.after(() => api.kill());

test('SYS-4: Platform dead-letter list and replay use existing Outbox APIs', async () => {
  await ready();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const tenantId = randomUUID();
  const eventId = randomUUID();
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(
      "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [tenantId, `sys4-dlq-${stamp}`, `SYS4 DLQ ${stamp}`],
    );
    await client.query(
      `insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,status,attempts,last_error,created_by,updated_by)
       values($1,$2,'sys4.dlq.demo.v1','sys4_dlq',$3,$4,$5,'sys4-dlq','needs_attention',8,'forced for SYS-4 UI',null,null)`,
      [eventId, tenantId, randomUUID(), {}, randomUUID()],
    );
  } finally {
    await client.end();
  }

  const token = await login('admin@system.local', 'ChangeMe123!', systemTenant);
  const list = await fetch(`${base}/api/v1/platform/outbox/dead-letters?limit=100`, {
    headers: { authorization: `Bearer ${token}`, 'x-request-id': randomUUID() },
  });
  assert.equal(list.status, 200);
  const letters = (await list.json()).data;
  assert.ok(letters.some((item) => item.id === eventId));

  const replay = await fetch(`${base}/api/v1/platform/outbox/${tenantId}/${eventId}/replay`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'x-request-id': randomUUID() },
  });
  assert.equal(replay.status, 201);
  const replayed = (await replay.json()).data;
  assert.equal(replayed.eventId, eventId);
  assert.equal(replayed.status, 'pending');

  const listedAgain = await fetch(`${base}/api/v1/platform/outbox/dead-letters?limit=100`, {
    headers: { authorization: `Bearer ${token}`, 'x-request-id': randomUUID() },
  });
  assert.equal(listedAgain.status, 200);
  assert.equal(
    (await listedAgain.json()).data.some((item) => item.id === eventId),
    false,
  );
});
