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
test('platform one-click provisioning reaches a machine-verifiable READY state', async () => {
  await ready();
  const token = await login(),
    key = randomUUID(),
    suffix = Date.now(),
    body = {
      slug: `trial-${suffix}`,
      tenantName: `Trial ${suffix}`,
      organizationName: 'HQ',
      merchantName: 'Trial Merchant',
      storeName: 'Main',
      address: '88 Commercial Road',
      phone: '021-55550000',
      businessHours: '09:00-21:00',
      adminName: 'Owner',
      adminEmail: `owner-${suffix}@example.test`,
      adminPassword: `Owner-${suffix}-Password!`,
      industry: 'restaurant',
      plan: 'starter',
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
  assert.equal(created.state, 'ready');
  assert.equal(created.steps.length, 11);
  assert.equal(created.steps.filter((step) => step.state === 'succeeded').length, 10);
  assert.equal(created.steps.filter((step) => step.state === 'skipped').length, 1);
  assert.ok(Object.values(created.verification).every(Boolean));
  assert.match(created.delivery.oneCode, /^[A-Z0-9]{20}$/);
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
  const ownerSession = await tenantLogin.json();
  for (const path of ['/api/v1/management/dashboard', '/api/v1/employee/workbench']) {
    const response = await fetch(`${base}${path}`, {
      headers: {
        authorization: `Bearer ${ownerSession.accessToken}`,
        'x-tenant-context': created.tenantId,
        'x-request-id': randomUUID(),
      },
    });
    assert.equal(response.status, 200, `${path} must be immediately available to the owner`);
  }
  const resolved = await fetch(`${base}${created.delivery.resolvePath}`);
  assert.equal(resolved.status, 200);
  const oneCode = (await resolved.json()).data;
  assert.equal(oneCode.tenant.slug, body.slug);
  assert.equal(oneCode.role, 'consumer');
  assert.ok(oneCode.targetPath.startsWith('/c/entry?tenant='));
  assert.equal((await fetch(`${base}${created.delivery.resolvePath}?role=unknown`)).status, 400);
  const publicEntry = await fetch(
    `${base}/api/v1/consumer/entry?tenant=${encodeURIComponent(body.slug)}`,
  );
  assert.equal(publicEntry.status, 200);
  const storefront = (await publicEntry.json()).data;
  assert.ok(storefront.storefront.liveVersionId);
  assert.equal(storefront.storefront.industry.family, 'restaurant');
  assert.ok(storefront.modules.length >= 6);
  const client = new Client({ connectionString: db });
  await client.connect();
  try {
    const counts = await client.query(
      "select (select count(*) from organizations where tenant_id=$1)::int as organizations,(select count(*) from stores where tenant_id=$1)::int as stores,(select count(*) from page_templates where tenant_id=$1 and code='consumer-storefront' and published_version_id is not null)::int as templates,(select count(*) from storefront_bindings where tenant_id=$1 and live_version_id is not null)::int as bindings,(select count(*) from membership_roles where tenant_id=$1)::int as memberships,(select count(*) from employees where tenant_id=$1)::int as employees,(select count(*) from tenant_provisioning_runs where tenant_id=$1 and state='ready')::int as ready_runs,(select count(*) from tenant_provisioning_steps s join tenant_provisioning_runs r on r.id=s.run_id where r.tenant_id=$1)::int as steps,(select count(*) from audit_logs where tenant_id=$2 and action='platform.tenant_ready' and resource_id=$3)::int as audits,(select count(*) from outbox_events where tenant_id=$2 and event_type='tenant.provisioning.ready.v1' and aggregate_id=$3)::int as outbox,(select count(*) from one_code_entries where tenant_id=$1 and status='active')::int as one_codes",
      [created.tenantId, tenant, created.runId],
    );
    assert.deepEqual(counts.rows[0], {
      organizations: 1,
      stores: 1,
      templates: 1,
      bindings: 1,
      memberships: 1,
      employees: 1,
      ready_runs: 1,
      steps: 11,
      audits: 1,
      outbox: 1,
      one_codes: 1,
    });
  } finally {
    await client.end();
  }
});
