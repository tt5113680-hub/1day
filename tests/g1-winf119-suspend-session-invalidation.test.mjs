/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const base = 'http://127.0.0.1:3196';
const systemTenant = '00000000-0000-4000-8000-000000000001';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3196',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'g1-winf119-suspend-session-invalidation',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
const apiLogs = [];
for (const stream of [api.stdout, api.stderr]) {
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    apiLogs.push(chunk);
    if (apiLogs.length > 40) apiLogs.shift();
  });
}

async function ready() {
  for (let i = 0; i < 50; i += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      // starting
    }
    await wait(100);
  }
  throw Error(`API did not start\n${apiLogs.join('')}`);
}

async function login(email, password, tenantId) {
  const response = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, tenantId }),
  });
  assert.equal(response.status, 201, `login ${email} should 201, got ${response.status}`);
  return response.json();
}

function headers(token, tenantId, extra = {}) {
  return {
    authorization: `Bearer ${token}`,
    'x-tenant-context': tenantId,
    'x-request-id': randomUUID(),
    'content-type': 'application/json',
    ...extra,
  };
}

async function provision(systemToken, suffix) {
  const slug = `winf119-${suffix}`;
  const email = `${slug}@example.test`;
  const password = `Winf119-${suffix}-Password!`;
  const response = await fetch(`${base}/api/v1/platform/onboarding`, {
    method: 'POST',
    headers: headers(systemToken, systemTenant, { 'idempotency-key': randomUUID() }),
    body: JSON.stringify({
      slug,
      tenantName: `WINF119 ${suffix}`,
      organizationName: 'WINF119 HQ',
      merchantName: 'WINF119 Merchant',
      storeName: 'WINF119 Store',
      address: '1 WINF119 Road',
      phone: '021-55551961',
      businessHours: '09:00-21:00',
      adminName: 'WINF119 Owner',
      adminEmail: email,
      adminPassword: password,
      industry: 'restaurant',
      plan: 'starter',
    }),
  });
  assert.equal(response.status, 201, `onboarding ${slug} should 201, got ${response.status}`);
  const run = (await response.json()).data;
  assert.equal(run.state, 'ready');
  return { slug, email, password, run };
}

test.after(() => api.kill());

test('W119 suspend immediately invalidates existing access tokens (auth_epoch session versioning)', async () => {
  try {
    await ready();
  } catch (error) {
    throw Error(String(error));
  }
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  let tenantId = '';
  try {
    const system = await login('admin@system.local', 'ChangeMe123!', systemTenant);
    const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const { slug, email, password, run } = await provision(system.accessToken, suffix);
    tenantId = run.tenantId;

    // --- owner logs in and obtains a live access token in the current epoch ---
    const owner = await login(email, password, tenantId);
    const epochBefore = (
      await client.query('select auth_epoch from tenants where id=$1', [tenantId])
    ).rows[0].auth_epoch;

    // The created session snapshots the current auth_epoch.
    const sessionRow = (
      await client.query(
        "select auth_epoch from auth_sessions where tenant_id=$1 and status='active' and revoked_at is null order by created_at desc limit 1",
        [tenantId],
      )
    ).rows[0];
    assert.equal(
      Number(sessionRow.auth_epoch),
      Number(epochBefore),
      'session snapshots pre-suspend epoch',
    );

    // Owner can read their own tenant's session-security observability before suspend.
    const pre = await fetch(`${base}/api/v1/management/session-security`, {
      headers: headers(owner.accessToken, tenantId),
    });
    assert.equal(pre.status, 200, 'owner reads session-security pre-suspend');
    const preBody = (await pre.json()).data;
    assert.equal(preBody.suspended, false);
    assert.equal(preBody.authEpoch, Number(epochBefore));
    assert.ok(preBody.activeSessions >= 1, 'pre-suspend has active session');

    // --- platform suspends the tenant (bumps auth_epoch) ---
    const tenantRow = await client.query('select version from tenants where id=$1', [tenantId]);
    const suspend = await fetch(`${base}/api/v1/platform/tenants/${tenantId}`, {
      method: 'PUT',
      headers: headers(system.accessToken, systemTenant, { 'idempotency-key': randomUUID() }),
      body: JSON.stringify({
        version: tenantRow.rows[0].version,
        plan: 'starter',
        riskLevel: 'low',
        quotas: { users: 10, customers: 1000, stores: 3 },
        status: 'suspended',
        confirmation: `SUSPEND:${slug}`,
      }),
    });
    const suspendJson = await suspend.json();
    assert.equal(
      suspend.status,
      200,
      `suspend should 200, got ${suspend.status} ${JSON.stringify(suspendJson)}\n${apiLogs.join('')}`,
    );
    const suspendBody = suspendJson.data;
    const epochAfter = Number(suspendBody.authEpoch);
    assert.equal(epochAfter, Number(epochBefore) + 1, 'auth_epoch bumped on suspend');

    // --- KEY W119 assertion: the ALREADY-ISSUED access token dies immediately ---
    const mgmtAfter = await fetch(`${base}/api/v1/management/dashboard`, {
      headers: headers(owner.accessToken, tenantId),
    });
    assert.equal(
      mgmtAfter.status,
      401,
      'pre-suspend access token rejected immediately after suspend',
    );
    const sessionSecurityAfter = await fetch(`${base}/api/v1/management/session-security`, {
      headers: headers(owner.accessToken, tenantId),
    });
    assert.equal(
      sessionSecurityAfter.status,
      401,
      'dead token also rejected on observability endpoint',
    );

    // refresh token cannot rotate
    const refresh = await fetch(`${base}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: owner.refreshToken }),
    });
    assert.equal(refresh.status, 401, 'refresh rejected after suspend');

    // all sessions revoked, none survive
    const active = await client.query(
      "select count(*)::int as n from auth_sessions where tenant_id=$1 and status='active' and revoked_at is null",
      [tenantId],
    );
    assert.equal(active.rows[0].n, 0, 'no active sessions remain after suspend');

    // --- reactivate: fresh login works, old pre-suspend token stays dead ---
    const reactRow = await client.query('select version from tenants where id=$1', [tenantId]);
    const reactivate = await fetch(`${base}/api/v1/platform/tenants/${tenantId}`, {
      method: 'PUT',
      headers: headers(system.accessToken, systemTenant, { 'idempotency-key': randomUUID() }),
      body: JSON.stringify({
        version: reactRow.rows[0].version,
        plan: 'starter',
        riskLevel: 'low',
        quotas: { users: 10, customers: 1000, stores: 3 },
        status: 'active',
        confirmation: `ACTIVATE:${slug}`,
      }),
    });
    assert.equal(reactivate.status, 200, `reactivate should 200, got ${reactivate.status}`);
    const epochReact = Number((await reactivate.json()).data.authEpoch);
    assert.equal(epochReact, epochAfter + 1, 'auth_epoch bumped again on reactivate');

    const oldTokenStillDead = await fetch(`${base}/api/v1/management/dashboard`, {
      headers: headers(owner.accessToken, tenantId),
    });
    assert.equal(
      oldTokenStillDead.status,
      401,
      'old pre-suspend token stays permanently dead after reactivate',
    );

    const fresh = await login(email, password, tenantId);
    const freshEpoch = Number(fresh.authEpoch);
    assert.equal(freshEpoch, epochReact, 'fresh login snapshots the new current epoch');
    const freshOk = await fetch(`${base}/api/v1/management/session-security`, {
      headers: headers(fresh.accessToken, tenantId),
    });
    assert.equal(freshOk.status, 200, 'fresh session works after reactivate');
    assert.equal((await freshOk.json()).data.suspended, false);
  } finally {
    await client.end().catch(() => {});
  }
});
