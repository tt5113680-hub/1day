/* global fetch */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { URL } from 'node:url';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const base = 'http://127.0.0.1:3272';
const systemTenant = '00000000-0000-4000-8000-000000000001';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

test('G1-W∞-130: static — circle pending exposure + consumer-visible guard', () => {
  const service = read('apps/api/src/platform-onboarding.service.ts');
  assert.match(service, /circleId/);
  assert.match(service, /circleExposure: 'pending'/);
  assert.match(service, /circle_not_consumer_visible/);
  assert.match(service, /platform_business_circle_merchants/);
  const page = read('apps/platform-web/app/p/tenants/new/page.tsx');
  assert.match(page, /provisioning-circle-exposure/);
  assert.match(page, /circle_not_consumer_visible/);
});

const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3272',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'g1-winf130-circle-exposure',
    ONEDAY_PROVISIONING_TEST_HOOKS: '1',
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

async function login() {
  const response = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@system.local',
      password: 'ChangeMe123!',
      tenantId: systemTenant,
    }),
  });
  assert.equal(response.status, 201);
  return (await response.json()).accessToken;
}

test.after(() => api.kill());

test('G1-W∞-130: READY with circle pending; Consumer discovery hides until dual approve', async () => {
  await ready();
  const token = await login();
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const circleId = randomUUID();
  const viewerTenantId = randomUUID();
  const viewerSlug = `w130-viewer-${stamp}`;
  try {
    await client.query(
      "insert into tenants(id,slug,name,created_by,updated_by) values($1,$2,'W130 Viewer',null,null)",
      [viewerTenantId, viewerSlug],
    );
    await client.query(
      "insert into platform_business_circles(id,tenant_id,code,name,description,created_by,updated_by) values($1,$2,$3,'W130 Circle','provisioning circle',null,null)",
      [circleId, systemTenant, `w130-circle-${stamp}`],
    );
    await client.query(
      `insert into platform_business_circle_merchants(
         id,tenant_id,circle_id,merchant_tenant_id,benefits,recommendation_reason,
         invitation_status,circle_approval_status,approval_status,display_config,created_by,updated_by
       ) values($1,$2,$3,$4,'[]'::jsonb,'viewer seed','accepted','approved','approved',$5::jsonb,null,null)`,
      [
        randomUUID(),
        systemTenant,
        circleId,
        viewerTenantId,
        JSON.stringify({ visible: true, sortOrder: 0 }),
      ],
    );

    const body = {
      slug: `w130-${stamp}`,
      tenantName: `W130 Merchant ${stamp}`,
      organizationName: `W130 Org ${stamp}`,
      merchantName: `W130 Co ${stamp}`,
      storeName: `W130 Store ${stamp}`,
      address: '上海市测试路 130 号',
      phone: '021-13001300',
      businessHours: '09:00-21:00',
      adminEmail: `owner-w130-${stamp}@example.com`,
      adminName: 'W130 Owner',
      adminPassword: `W130-${stamp}-Password!`,
      industry: 'restaurant',
      plan: 'starter',
      activationMode: 'password',
      circleId,
    };
    const res = await fetch(`${base}/api/v1/platform/onboarding`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        'x-request-id': randomUUID(),
        'idempotency-key': `w130-${stamp}`,
      },
      body: JSON.stringify(body),
    });
    assert.equal(res.status, 201);
    const data = (await res.json()).data;
    assert.equal(data.state, 'ready');
    assert.equal(data.delivery.circle.exposure, 'pending');
    assert.equal(data.delivery.circle.consumerVisible, false);
    assert.equal(data.verification.circle_not_consumer_visible, true);
    assert.equal(
      data.steps.find((s) => s.code === 'channel_circle')?.state,
      'succeeded',
    );

    const membership = await client.query(
      `select invitation_status,circle_approval_status,approval_status,display_config
       from platform_business_circle_merchants
       where circle_id=$1 and merchant_tenant_id=$2 and deleted_at is null`,
      [circleId, data.tenantId],
    );
    assert.equal(membership.rows[0]?.circle_approval_status, 'pending');
    assert.equal(membership.rows[0]?.approval_status, 'pending');
    assert.equal(membership.rows[0]?.display_config?.visible, false);

    const discovery = await fetch(
      `${base}/api/v1/consumer/discovery?tenant=${encodeURIComponent(viewerSlug)}&latitude=31.2304&longitude=121.4737`,
      { headers: { 'x-request-id': randomUUID() } },
    );
    assert.equal(discovery.status, 200);
    const payload = await discovery.json();
    const flat = JSON.stringify(payload.data ?? payload);
    assert.equal(flat.includes(body.slug), false, 'pending circle merchant must not appear');
    assert.equal(flat.includes(data.tenantId), false);
  } finally {
    await client.query('delete from platform_business_circle_merchants where circle_id=$1', [
      circleId,
    ]);
    await client.query('delete from platform_business_circles where id=$1', [circleId]);
    await client.query('delete from tenants where id=$1', [viewerTenantId]);
    await client.end();
  }
});
