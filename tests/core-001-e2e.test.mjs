/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { signAccessToken } from '../packages/auth/dist/index.js';
import { createDatabase, destroyDatabase } from '../packages/database/dist/index.js';

const base = 'http://127.0.0.1:3016';
const tenantId = '00000000-0000-4000-8000-000000000001';
const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const secret = 'core-001-e2e-secret';
const env = { ...process.env, PORT: '3016', DATABASE_URL: databaseUrl, AUTH_TOKEN_SECRET: secret };
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env,
  stdio: 'ignore',
});

async function request(path, options) {
  return fetch(`${base}${path}`, options);
}

async function ready() {
  for (let i = 0; i < 30; i += 1) {
    try {
      if ((await request('/api/v1/health')).ok) return;
    } catch {
      // API is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('API did not become ready');
}

function headers(token, idempotencyKey) {
  return {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
    'x-request-id': randomUUID(),
    ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}),
  };
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

test('organization, merchant and store writes are tenant-bound, idempotent, audited and versioned', async () => {
  await ready();
  const token = await login();
  const suffix = Date.now().toString(36);
  const parentBody = { code: `hq-${suffix}`, name: 'Core HQ', organizationType: 'headquarters' };
  const parentHeaders = headers(token, `core001-org-${suffix}`);
  const parentResponse = await request('/api/v1/organizations', {
    method: 'POST',
    headers: parentHeaders,
    body: JSON.stringify(parentBody),
  });
  assert.equal(parentResponse.status, 201);
  const parent = (await parentResponse.json()).data;
  assert.equal(parent.tenantId, tenantId);
  assert.equal(parent.version, 1);

  const replayResponse = await request('/api/v1/organizations', {
    method: 'POST',
    headers: { ...parentHeaders, 'x-request-id': randomUUID() },
    body: JSON.stringify(parentBody),
  });
  assert.equal(replayResponse.status, 201);
  assert.equal((await replayResponse.json()).data.id, parent.id);

  const childResponse = await request('/api/v1/organizations', {
    method: 'POST',
    headers: headers(token, `core001-child-${suffix}`),
    body: JSON.stringify({
      code: `region-${suffix}`,
      name: 'Core Region',
      organizationType: 'region',
      parentOrganizationId: parent.id,
    }),
  });
  assert.equal(childResponse.status, 201);
  const child = (await childResponse.json()).data;

  const merchantResponse = await request('/api/v1/merchants', {
    method: 'POST',
    headers: headers(token, `core001-merchant-${suffix}`),
    body: JSON.stringify({
      code: `merchant-${suffix}`,
      name: 'Core Merchant',
      organizationId: child.id,
    }),
  });
  assert.equal(merchantResponse.status, 201);
  const merchant = (await merchantResponse.json()).data;

  const storeResponse = await request('/api/v1/stores', {
    method: 'POST',
    headers: headers(token, `core001-store-${suffix}`),
    body: JSON.stringify({
      code: `store-${suffix}`,
      name: 'Core Store',
      organizationId: child.id,
      merchantId: merchant.id,
      address: 'Shanghai',
    }),
  });
  assert.equal(storeResponse.status, 201);
  const store = (await storeResponse.json()).data;
  assert.equal(store.merchantId, merchant.id);
  assert.equal(store.organizationId, child.id);

  const listed = await request('/api/v1/organizations', { headers: headers(token) });
  assert.equal(listed.status, 200);
  assert.ok((await listed.json()).data.some((organization) => organization.id === child.id));

  const update = await request(`/api/v1/organizations/${parent.id}`, {
    method: 'PATCH',
    headers: headers(token),
    body: JSON.stringify({ name: 'Core HQ Updated', version: parent.version }),
  });
  assert.equal(update.status, 200);
  assert.equal((await update.json()).data.version, 2);
  const conflict = await request(`/api/v1/organizations/${parent.id}`, {
    method: 'PATCH',
    headers: headers(token),
    body: JSON.stringify({ name: 'Stale Update', version: parent.version }),
  });
  assert.equal(conflict.status, 409);

  const missingKey = await request('/api/v1/organizations', {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(parentBody),
  });
  assert.equal(missingKey.status, 400);
  assert.equal(
    (await request('/api/v1/organizations', { headers: { 'x-request-id': randomUUID() } })).status,
    401,
  );
  assert.equal(
    (
      await request('/api/v1/organizations', {
        headers: { ...headers(token), 'x-tenant-context': '00000000-0000-4000-8000-000000000099' },
      })
    ).status,
    403,
  );

  const database = createDatabase(databaseUrl);
  try {
    const deniedUser = randomUUID();
    await database
      .insertInto('users')
      .values({
        id: deniedUser,
        email: `denied-${suffix}@example.test`,
        display_name: 'Denied User',
        status: 'active',
      })
      .execute();
    await database
      .insertInto('memberships')
      .values({ id: randomUUID(), tenant_id: tenantId, user_id: deniedUser, status: 'active' })
      .execute();
    const deniedToken = signAccessToken(
      { sub: deniedUser, tenantId, sessionId: randomUUID(), exp: Date.now() + 60_000 },
      secret,
    );
    assert.equal(
      (await request('/api/v1/organizations', { headers: headers(deniedToken) })).status,
      403,
    );
    const audit = await database
      .selectFrom('audit_logs')
      .select(({ fn }) => fn.countAll().as('count'))
      .where('tenant_id', '=', tenantId)
      .where('action', 'in', [
        'organization.created',
        'merchant.created',
        'store.created',
        'organization.updated',
      ])
      .executeTakeFirstOrThrow();
    assert.ok(Number(audit.count) >= 5);
  } finally {
    await destroyDatabase(database);
  }
});
