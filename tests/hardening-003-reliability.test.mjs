/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const tenantId = '00000000-0000-4000-8000-000000000001';
const base = 'http://127.0.0.1:3161';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3161',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'hardening-003',
  },
  stdio: 'ignore',
});
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const headers = (token, key) => ({
  authorization: `Bearer ${token}`,
  'content-type': 'application/json',
  'x-request-id': randomUUID(),
  ...(key ? { 'idempotency-key': key } : {}),
});
const request = (path, options) => fetch(`${base}/api/v1${path}`, options);

async function ready() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      if ((await request('/health')).ok) return;
    } catch {
      // API is starting.
    }
    await wait(100);
  }
  throw Error('API did not start');
}

async function login() {
  const response = await request('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin@system.local', password: 'ChangeMe123!', tenantId }),
  });
  assert.equal(response.status, 201);
  return (await response.json()).accessToken;
}

test.after(() => api.kill());

test('readiness proves the database is available and fails closed when it is not', async () => {
  await ready();
  const healthy = await request('/health');
  assert.equal(healthy.status, 200);
  assert.deepEqual(await healthy.json(), {
    status: 'ok',
    service: 'oneday-api',
    database: 'ready',
  });

  const unavailable = spawn(process.execPath, ['apps/api/dist/main.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: '3162',
      DATABASE_URL: 'postgresql://invalid:invalid@127.0.0.1:1/unavailable',
      AUTH_TOKEN_SECRET: 'hardening-003-unavailable',
    },
    stdio: 'ignore',
  });
  try {
    const statuses = [];
    for (let attempt = 0; attempt < 80; attempt += 1) {
      let response;
      try {
        response = await fetch('http://127.0.0.1:3162/api/v1/health');
      } catch {
        // API is starting.
      }
      if (response) {
        statuses.push(response.status);
        if (response.status === 503) {
          const body = await response.json();
          assert.deepEqual(body, {
            status: 'unavailable',
            service: 'oneday-api',
            database: 'unavailable',
          });
          return;
        }
      }
      await wait(100);
    }
    throw Error(`Unavailable database did not produce a readiness failure: ${statuses.join(',')}`);
  } finally {
    unavailable.kill();
  }
});

test('connector health can degrade then recover with versioned, idempotent audit and outbox evidence', async () => {
  await ready();
  const token = await login();
  const stamp = Date.now();
  const created = await request('/platform/connectors', {
    method: 'POST',
    headers: headers(token, `h003-connector-${stamp}`),
    body: JSON.stringify({
      code: `h003-connector-${stamp}`,
      name: 'H003 Reliability Connector',
      authMode: 'oauth',
      rateLimitPerMinute: 60,
    }),
  });
  assert.equal(created.status, 201);
  const connector = (await created.json()).data;
  const degraded = await request(`/platform/connectors/${connector.id}/health-observations`, {
    method: 'POST',
    headers: headers(token, `h003-degraded-${stamp}`),
    body: JSON.stringify({
      status: 'unavailable',
      message: 'Synthetic upstream timeout; automatic recovery check required.',
      version: connector.version,
    }),
  });
  assert.equal(degraded.status, 201);
  const degradedData = (await degraded.json()).data;
  const recovered = await request(`/platform/connectors/${connector.id}/health-observations`, {
    method: 'POST',
    headers: headers(token, `h003-recovered-${stamp}`),
    body: JSON.stringify({
      status: 'healthy',
      message: 'Recovery observation after bounded retry window.',
      version: degradedData.version,
    }),
  });
  assert.equal(recovered.status, 201);
  const listed = await request('/platform/connectors', { headers: headers(token) });
  assert.equal(listed.status, 200);
  const item = (await listed.json()).data.find((row) => row.id === connector.id);
  assert.equal(item.health_status, 'healthy');
  assert.equal(item.logs[0].status, 'healthy');
  assert.equal(item.logs[1].status, 'unavailable');
});
