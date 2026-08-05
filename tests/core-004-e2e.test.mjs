/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const requireFromApi = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { Client } = requireFromApi('pg');

const base = 'http://127.0.0.1:3019';
const tenantId = '00000000-0000-4000-8000-000000000001';
const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3019',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'core-004-e2e-secret',
  },
  stdio: 'ignore',
});
const request = (path, options) => fetch(base + path, options);
const headers = (token, key) => ({
  authorization: `Bearer ${token}`,
  'content-type': 'application/json',
  'x-request-id': randomUUID(),
  ...(key ? { 'idempotency-key': key } : {}),
});

async function ready() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      if ((await request('/api/v1/health')).ok) return;
    } catch {
      // API is starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('API did not become ready');
}

async function login() {
  const response = await request('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin@system.local', password: 'ChangeMe123!', tenantId }),
  });
  assert.equal(response.status, 201);
  return (await response.json()).accessToken;
}

test.after(() => api.kill());

test('customer identities deduplicate, merge with audit and emit traceable events', async () => {
  await ready();
  const token = await login();
  const stamp = Date.now().toString();
  const firstBody = {
    displayName: 'First customer',
    identities: [
      { type: 'phone', value: `139${stamp.slice(-8).padStart(8, '0')}` },
      { type: 'wechat', value: `wx_${stamp}_one` },
    ],
  };
  const first = await request('/api/v1/customers', {
    method: 'POST',
    headers: headers(token, `customer-a-${stamp}`),
    body: JSON.stringify(firstBody),
  });
  assert.equal(first.status, 201);
  const customerA = (await first.json()).data;
  assert.equal(customerA.identities[0].maskedValue.includes(firstBody.identities[0].value), false);

  const replay = await request('/api/v1/customers', {
    method: 'POST',
    headers: headers(token, `customer-a-${stamp}`),
    body: JSON.stringify(firstBody),
  });
  assert.equal((await replay.json()).data.id, customerA.id);

  const duplicate = await request('/api/v1/customers', {
    method: 'POST',
    headers: headers(token, `customer-duplicate-${stamp}`),
    body: JSON.stringify({
      displayName: 'Duplicate',
      identities: [{ type: 'phone', value: firstBody.identities[0].value }],
    }),
  });
  assert.equal(duplicate.status, 409);

  const second = await request('/api/v1/customers', {
    method: 'POST',
    headers: headers(token, `customer-b-${stamp}`),
    body: JSON.stringify({
      displayName: 'Second customer',
      identities: [{ type: 'wechat', value: `wx_${stamp}_two` }],
    }),
  });
  assert.equal(second.status, 201);
  const customerB = (await second.json()).data;
  const identityAdded = await request(`/api/v1/customers/${customerB.id}/identities`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({
      version: customerB.version,
      identity: { type: 'phone', value: `138${stamp.slice(-8).padStart(8, '0')}` },
    }),
  });
  assert.equal(identityAdded.status, 201);
  const currentB = (await identityAdded.json()).data;
  const staleIdentity = await request(`/api/v1/customers/${customerB.id}/identities`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({
      version: customerB.version,
      identity: { type: 'wechat', value: `stale_${stamp}` },
    }),
  });
  assert.equal(staleIdentity.status, 409);

  const merged = await request(`/api/v1/customers/${customerB.id}/merge`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({
      targetCustomerId: customerA.id,
      sourceVersion: currentB.version,
      targetVersion: customerA.version,
      reason: 'Verified duplicate profiles',
    }),
  });
  assert.equal(merged.status, 201);
  assert.equal((await merged.json()).data.targetCustomerId, customerA.id);
  const listed = await request('/api/v1/customers', { headers: headers(token) });
  const active = (await listed.json()).data;
  const mergedCustomer = active.find((item) => item.id === customerA.id);
  assert.equal(mergedCustomer.identities.length, 4);

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const audit = await client.query(
      "select action from audit_logs where tenant_id=$1 and resource_id=$2 and action='customer.merged'",
      [tenantId, customerB.id],
    );
    const event = await client.query(
      "select event_type,correlation_id,trace_id from outbox_events where tenant_id=$1 and aggregate_id=$2 and event_type='customer.merged.v1'",
      [tenantId, customerA.id],
    );
    assert.equal(audit.rowCount, 1);
    assert.equal(event.rowCount, 1);
    assert.ok(event.rows[0].correlation_id);
    assert.ok(event.rows[0].trace_id);
  } finally {
    await client.end();
  }

  assert.equal(
    (await request('/api/v1/customers', { headers: { 'x-request-id': randomUUID() } })).status,
    401,
  );
  assert.equal(
    (
      await request('/api/v1/customers', {
        headers: { ...headers(token), 'x-tenant-context': '00000000-0000-4000-8000-000000000099' },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request('/api/v1/customers', {
        method: 'POST',
        headers: headers(token, `invalid-${stamp}`),
        body: JSON.stringify({ displayName: '', identities: [] }),
      })
    ).status,
    400,
  );
});
