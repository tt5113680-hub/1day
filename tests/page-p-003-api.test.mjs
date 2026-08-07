/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';
const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test',
  base = 'http://127.0.0.1:3125',
  tenant = '00000000-0000-4000-8000-000000000001',
  api = spawn(process.execPath, ['apps/api/dist/main.js'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: '3125', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'page-p-003-api' },
    stdio: 'ignore',
  }),
  wait = (m) => new Promise((r) => setTimeout(r, m));
async function ready() {
  for (let i = 0; i < 30; i += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      /*starting*/
    }
    await wait(100);
  }
  throw Error('API did not start');
}
async function login() {
  const r = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@system.local',
      password: 'ChangeMe123!',
      tenantId: tenant,
    }),
  });
  assert.equal(r.status, 201);
  return (await r.json()).accessToken;
}
test.after(() => api.kill());
test('platform onboarding atomically provisions tenant resources and is idempotent', async () => {
  await ready();
  const token = await login(),
    key = randomUUID(),
    suffix = Date.now(),
    body = {
      slug: `trial-${suffix}`,
      tenantName: `Trial ${suffix}`,
      organizationName: 'HQ',
      storeName: 'Main',
      adminName: 'Owner',
      adminEmail: `owner-${suffix}@example.test`,
      adminPassword: `Owner-${suffix}-Password!`,
      template: 'starter',
    },
    headers = {
      authorization: `Bearer ${token}`,
      'x-request-id': randomUUID(),
      'idempotency-key': key,
      'content-type': 'application/json',
    };
  assert.equal(
    (
      await fetch(`${base}/api/v1/platform/onboarding`, {
        method: 'POST',
        headers: { 'x-request-id': randomUUID() },
        body: JSON.stringify(body),
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await fetch(`${base}/api/v1/platform/onboarding`, {
        method: 'POST',
        headers: { ...headers, 'idempotency-key': randomUUID() },
        body: JSON.stringify({ ...body, slug: 'Bad slug' }),
      })
    ).status,
    400,
  );
  const first = await fetch(`${base}/api/v1/platform/onboarding`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  assert.equal(first.status, 201);
  const created = (await first.json()).data;
  const repeated = await fetch(`${base}/api/v1/platform/onboarding`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  assert.equal(repeated.status, 201);
  assert.equal((await repeated.json()).data.tenantId, created.tenantId);
  const tenantLogin = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: body.adminEmail,
      password: body.adminPassword,
      tenantId: created.tenantId,
    }),
  });
  assert.equal(tenantLogin.status, 201);
  const client = new Client({ connectionString: db });
  await client.connect();
  try {
    const counts = await client.query(
      "select (select count(*) from organizations where tenant_id=$1)::int as organizations,(select count(*) from stores where tenant_id=$1)::int as stores,(select count(*) from page_templates where tenant_id=$1 and code='consumer-starter')::int as templates,(select count(*) from membership_roles where tenant_id=$1)::int as memberships,(select count(*) from audit_logs where tenant_id=$2 and action='platform.tenant_onboarded' and resource_id=$1)::int as audits,(select count(*) from outbox_events where tenant_id=$2 and event_type='platform.tenant.onboarded.v1' and aggregate_id=$1)::int as outbox,(select count(*) from idempotency_keys where tenant_id=$2 and resource_type='platform_onboarding' and idempotency_key=$3)::int as keys",
      [created.tenantId, tenant, key],
    );
    assert.deepEqual(counts.rows[0], {
      organizations: 1,
      stores: 1,
      templates: 1,
      memberships: 1,
      audits: 1,
      outbox: 1,
      keys: 1,
    });
  } finally {
    await client.end();
  }
});
