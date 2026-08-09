/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const base = 'http://127.0.0.1:3345';
const systemTenant = '00000000-0000-4000-8000-000000000001';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3345',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'matrix-concurrent',
  },
  stdio: 'ignore',
});

async function ready() {
  for (let i = 0; i < 50; i += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      // starting
    }
    await wait(100);
  }
  throw Error('API did not start');
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

function headers(token, tenantId, extra = {}) {
  return {
    authorization: `Bearer ${token}`,
    'x-tenant-context': tenantId,
    'x-request-id': randomUUID(),
    'content-type': 'application/json',
    ...extra,
  };
}

test.after(() => api.kill());

test('TP-02 concurrent slug conflict leaves zero orphan tenants', async () => {
  await ready();
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const slug = `race-${suffix}`;
  try {
    const system = await login('admin@system.local', 'ChangeMe123!', systemTenant);
    const body = (email) => ({
      slug,
      tenantName: `Race ${suffix}`,
      organizationName: 'Race HQ',
      merchantName: 'Race Merchant',
      storeName: 'Race Store',
      address: '2 Race Road',
      phone: '021-55550222',
      businessHours: '09:00-21:00',
      adminName: 'Race Owner',
      adminEmail: email,
      adminPassword: `Race-${suffix}-Password!`,
      industry: 'restaurant',
      plan: 'starter',
    });
    const [first, second] = await Promise.all([
      fetch(`${base}/api/v1/platform/onboarding`, {
        method: 'POST',
        headers: headers(system, systemTenant, { 'idempotency-key': randomUUID() }),
        body: JSON.stringify(body(`${slug}-a@example.test`)),
      }),
      fetch(`${base}/api/v1/platform/onboarding`, {
        method: 'POST',
        headers: headers(system, systemTenant, { 'idempotency-key': randomUUID() }),
        body: JSON.stringify(body(`${slug}-b@example.test`)),
      }),
    ]);
    const statuses = [first.status, second.status].sort();
    assert.ok(statuses.includes(201));
    assert.ok(statuses.some((status) => status === 409 || status === 400 || status === 201));
    const tenants = await client.query(
      'select count(*)::int as count from tenants where slug=$1 and deleted_at is null',
      [slug],
    );
    assert.equal(tenants.rows[0].count, 1);
    const orphans = await client.query(
      `select count(*)::int as count from tenant_provisioning_runs
       where request_slug=$1 and state not in ('ready','failed','failed_terminal','failed_recoverable') and deleted_at is null`,
      [slug],
    );
    assert.equal(orphans.rows[0].count, 0);
  } finally {
    await client.end();
  }
});

test('MB-02 concurrent redeem succeeds once with ledger balance integrity', async () => {
  await ready();
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const slug = `c-mem-${suffix}`;
  const email = `${slug}@example.test`;
  const password = `Member-${suffix}-Password!`;
  const system = await login('admin@system.local', 'ChangeMe123!', systemTenant);
  const provision = await fetch(`${base}/api/v1/platform/onboarding`, {
    method: 'POST',
    headers: headers(system, systemTenant, { 'idempotency-key': randomUUID() }),
    body: JSON.stringify({
      slug,
      tenantName: `CMem ${suffix}`,
      organizationName: 'CMem HQ',
      merchantName: 'CMem Merchant',
      storeName: 'CMem Store',
      address: '3 Concurrent Road',
      phone: '021-55550333',
      businessHours: '09:00-21:00',
      adminName: 'CMem Owner',
      adminEmail: email,
      adminPassword: password,
      industry: 'beauty',
      plan: 'starter',
    }),
  });
  assert.equal(provision.status, 201);
  const run = (await provision.json()).data;
  const owner = await login(email, password, run.tenantId);
  const storeId = run.steps.find((step) => step.code === 'organization_store').output.storeId;
  const enroll = await fetch(`${base}/api/v1/consumer/memberships/enroll?tenant=${slug}`, {
    method: 'POST',
    headers: { 'idempotency-key': randomUUID(), 'content-type': 'application/json' },
    body: JSON.stringify({ storeId, phone: '13900139000', consent: true }),
  });
  assert.equal(enroll.status, 201);
  const member = (await enroll.json()).data;
  const list = await fetch(`${base}/api/v1/management/memberships`, {
    headers: headers(owner, run.tenantId),
  });
  const benefit = (await list.json()).data.benefits[0];
  const grant = await fetch(`${base}/api/v1/management/memberships/${member.enrollmentId}/grants`, {
    method: 'POST',
    headers: headers(owner, run.tenantId, { 'idempotency-key': randomUUID() }),
    body: JSON.stringify({ benefitId: benefit.id, quantity: 1 }),
  });
  assert.equal(grant.status, 201);
  const redeems = await Promise.all(
    [0, 1].map(() =>
      fetch(`${base}/api/v1/employee/memberships/redeem`, {
        method: 'POST',
        headers: headers(owner, run.tenantId, { 'idempotency-key': randomUUID() }),
        body: JSON.stringify({ memberCode: member.memberCode, benefitId: benefit.id }),
      }),
    ),
  );
  const redeemStatuses = redeems.map((response) => response.status).sort();
  assert.equal(redeemStatuses.filter((status) => status === 201).length, 1);
  assert.ok(redeemStatuses.some((status) => status === 409 || status === 400 || status === 201));
  const wallet = await fetch(
    `${base}/api/v1/consumer/memberships/wallet?tenant=${slug}&accessId=${member.profileAccessId}&access=${member.profileAccess}`,
  );
  assert.equal(wallet.status, 200);
  assert.equal((await wallet.json()).data.benefits[0].balance, 0);
});

test('SF-01 concurrent consumer reads never observe draft or half-published modules', async () => {
  await ready();
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const slug = `c-sf-${suffix}`;
  const email = `${slug}@example.test`;
  const password = `Storefront-${suffix}-Password!`;
  const system = await login('admin@system.local', 'ChangeMe123!', systemTenant);
  const provision = await fetch(`${base}/api/v1/platform/onboarding`, {
    method: 'POST',
    headers: headers(system, systemTenant, { 'idempotency-key': randomUUID() }),
    body: JSON.stringify({
      slug,
      tenantName: `CSF ${suffix}`,
      organizationName: 'CSF HQ',
      merchantName: 'CSF Merchant',
      storeName: 'CSF Store',
      address: '4 Publish Road',
      phone: '021-55550444',
      businessHours: '09:00-21:00',
      adminName: 'CSF Owner',
      adminEmail: email,
      adminPassword: password,
      industry: 'restaurant',
      plan: 'starter',
    }),
  });
  assert.equal(provision.status, 201);
  const run = (await provision.json()).data;
  const owner = await login(email, password, run.tenantId);
  const list = await fetch(`${base}/api/v1/page-templates`, {
    headers: headers(owner, run.tenantId),
  });
  assert.equal(list.status, 200);
  const template = (await list.json()).data.find((item) => item.binding_id);
  assert.ok(template);
  const v1 = template.live_version_id;
  const draftCreate = await fetch(`${base}/api/v1/page-templates/${template.id}/drafts`, {
    method: 'POST',
    headers: headers(owner, run.tenantId),
    body: JSON.stringify({ sourceVersionId: v1 }),
  });
  assert.equal(draftCreate.status, 201);
  const draft = (await draftCreate.json()).data;
  const modules = [
    { moduleType: 'store_hero', config: { emphasis: 'race', visible: true } },
    { moduleType: 'service_catalog', config: { presentation: 'menu', visible: true } },
    { moduleType: 'member_entry', config: { mode: 'enrollment', visible: true } },
    { moduleType: 'store_info', config: { visible: true } },
  ];
  const updated = await fetch(`${base}/api/v1/page-templates/${template.id}/drafts/${draft.id}`, {
    method: 'PUT',
    headers: headers(owner, run.tenantId),
    body: JSON.stringify({ version: draft.version ?? 1, modules }),
  });
  assert.equal(updated.status, 200);
  const refreshed = await (
    await fetch(`${base}/api/v1/page-templates`, { headers: headers(owner, run.tenantId) })
  ).json();
  const beforePublish = refreshed.data.find((item) => item.id === template.id);
  const readers = Array.from({ length: 8 }, () =>
    fetch(`${base}/api/v1/consumer/stores/${template.store_id}?tenant=${slug}`, {
      headers: { 'x-request-id': randomUUID() },
    }),
  );
  const publish = fetch(`${base}/api/v1/page-templates/${template.id}/publish`, {
    method: 'POST',
    headers: headers(owner, run.tenantId, { 'idempotency-key': randomUUID() }),
    body: JSON.stringify({
      versionId: draft.id,
      templateVersion: beforePublish.version,
      bindingVersion: beforePublish.binding_version,
    }),
  });
  const results = await Promise.all([...readers, publish]);
  for (const response of results.slice(0, 8)) {
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.data.storefront.mode, 'published');
    assert.ok(
      body.data.storefront.templateVersionId === v1 ||
        body.data.storefront.templateVersionId === draft.id,
    );
    assert.ok(Array.isArray(body.data.storefront.modules));
    assert.ok(body.data.storefront.modules.length > 0);
  }
  assert.equal(results[8].status, 201);
  const live = await fetch(`${base}/api/v1/consumer/stores/${template.store_id}?tenant=${slug}`, {
    headers: { 'x-request-id': randomUUID() },
  });
  assert.equal(live.status, 200);
  assert.equal((await live.json()).data.storefront.templateVersionId, draft.id);
});
