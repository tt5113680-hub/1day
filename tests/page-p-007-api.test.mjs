/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const base = 'http://127.0.0.1:3139';
const tenantId = '00000000-0000-4000-8000-000000000001';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3139', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'page-p-007-api' },
  stdio: 'ignore',
});
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function ready() {
  for (let i = 0; i < 30; i += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      // API is starting.
    }
    await wait(100);
  }
  throw Error('API did not start');
}
async function login() {
  const r = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin@system.local', password: 'ChangeMe123!', tenantId }),
  });
  assert.equal(r.status, 201);
  return (await r.json()).accessToken;
}
test.after(() => api.kill());
test('platform connectors persist definitions, health logs and tenant authorization summaries', async () => {
  await ready();
  const token = await login();
  const headers = {
    authorization: `Bearer ${token}`,
    'x-request-id': randomUUID(),
    'idempotency-key': randomUUID(),
    'content-type': 'application/json',
  };
  const body = {
    code: `connector-${Date.now()}`,
    name: 'Verified Connector',
    authMode: 'oauth',
    rateLimitPerMinute: 120,
  };
  assert.equal(
    (
      await fetch(`${base}/api/v1/platform/connectors`, {
        headers: { 'x-request-id': randomUUID() },
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await fetch(`${base}/api/v1/platform/connectors`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...body, rateLimitPerMinute: 0 }),
      })
    ).status,
    400,
  );
  const created = await fetch(`${base}/api/v1/platform/connectors`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  assert.equal(created.status, 201);
  const item = (await created.json()).data;
  const replay = await fetch(`${base}/api/v1/platform/connectors`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  assert.equal((await replay.json()).data.id, item.id);
  const observed = await fetch(
    `${base}/api/v1/platform/connectors/${item.id}/health-observations`,
    {
      method: 'POST',
      headers: { ...headers, 'x-request-id': randomUUID(), 'idempotency-key': randomUUID() },
      body: JSON.stringify({
        status: 'healthy',
        message: 'Observed without an external call.',
        version: item.version,
      }),
    },
  );
  assert.equal(observed.status, 201);
  const listed = await fetch(`${base}/api/v1/platform/connectors`, {
    headers: { authorization: `Bearer ${token}`, 'x-request-id': randomUUID() },
  });
  const listedItem = (await listed.json()).data.find((x) => x.id === item.id);
  assert.equal(listedItem.health_status, 'healthy');
  assert.equal(listedItem.logs[0].message, 'Observed without an external call.');
});
