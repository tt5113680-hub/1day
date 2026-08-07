/* global fetch, setTimeout, URL */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';

const requireFromApi = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { Client } = requireFromApi('pg');
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const tenant = '00000000-0000-4000-8000-000000000001';
const base = 'http://127.0.0.1:3117';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3117', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'page-m-016-api' },
  stdio: 'ignore',
});
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
async function ready() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      /* starting */
    }
    await wait(100);
  }
  throw Error('API did not start');
}
async function login() {
  const response = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@system.local',
      password: 'ChangeMe123!',
      tenantId: tenant,
    }),
  });
  assert.equal(response.status, 201);
  return (await response.json()).accessToken;
}
test.after(() => api.kill());
test('tenant operating settings validate, isolate, version, audit and emit events', async () => {
  await ready();
  const token = await login();
  const headers = {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
    'x-request-id': randomUUID(),
  };
  assert.equal(
    (
      await fetch(`${base}/api/v1/management/settings`, {
        headers: { 'x-request-id': randomUUID() },
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await fetch(`${base}/api/v1/management/settings`, {
        headers: { ...headers, 'x-tenant-context': randomUUID() },
      })
    ).status,
    403,
  );
  const initial = await fetch(`${base}/api/v1/management/settings`, { headers });
  assert.equal(initial.status, 200);
  const current = (await initial.json()).data;
  const payload = {
    ...current,
    reminders: { defaultDueHours: 12, escalationHours: 24 },
    brand: { displayName: `Operating ${Date.now()}`, primaryColor: '#1D4ED8' },
  };
  const key = randomUUID();
  const write = (body = payload, idempotencyKey = key) =>
    fetch(`${base}/api/v1/management/settings`, {
      method: 'PUT',
      headers: { ...headers, 'idempotency-key': idempotencyKey },
      body: JSON.stringify(body),
    });
  assert.equal(
    (
      await write(
        { ...payload, doNotDisturb: { ...payload.doNotDisturb, startHour: 24 } },
        randomUUID(),
      )
    ).status,
    400,
  );
  const saved = await write();
  assert.equal(saved.status, 200);
  const updated = (await saved.json()).data;
  assert.equal(updated.reminders.defaultDueHours, 12);
  const repeated = await write();
  assert.equal(repeated.status, 200);
  assert.equal((await repeated.json()).data.version, updated.version);
  assert.equal((await write({ ...payload, version: current.version }, randomUUID())).status, 409);
  const client = new Client({ connectionString: db });
  await client.connect();
  try {
    const audit = await client.query(
      "select id from audit_logs where tenant_id=$1 and resource_type='tenant_operating_settings' order by created_at desc limit 1",
      [tenant],
    );
    const event = await client.query(
      "select id from outbox_events where tenant_id=$1 and event_type='tenant.operating_settings.updated.v1' order by created_at desc limit 1",
      [tenant],
    );
    assert.equal(audit.rowCount, 1);
    assert.equal(event.rowCount, 1);
  } finally {
    await client.end();
  }
});
