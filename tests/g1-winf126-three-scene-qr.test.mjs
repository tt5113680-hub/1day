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
const base = 'http://127.0.0.1:3268';
const systemTenant = '00000000-0000-4000-8000-000000000001';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const SCENES = ['consumer_storefront', 'owner_activation', 'employee_onboarding'];

test('G1-W∞-126: static — three scenes + revoke endpoint present', () => {
  const service = read('apps/api/src/platform-onboarding.service.ts');
  assert.match(service, /consumer_storefront/);
  assert.match(service, /owner_activation/);
  assert.match(service, /employee_onboarding/);
  assert.match(service, /revokeDeliveryScene/);
  assert.match(service, /platform\.delivery_scene_revoked/);
  const controller = read('apps/api/src/platform-onboarding.controller.ts');
  assert.match(controller, /delivery\/revoke/);
  const page = read('apps/platform-web/app/p/tenants/new/page.tsx');
  assert.match(page, /provisioning-delivery-scenes/);
  assert.match(page, /provisioning-revoke-\$\{scene\.scene\}/);
});

const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3268',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'g1-winf126-three-scene-qr',
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

test('G1-W∞-126: three QR scenes resolve; revoke stops resolve', async () => {
  await ready();
  const token = await login();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const body = {
    slug: `w126-${stamp}`,
    tenantName: `W126 Merchant ${stamp}`,
    organizationName: `W126 Org ${stamp}`,
    merchantName: `W126 Co ${stamp}`,
    storeName: `W126 Store ${stamp}`,
    address: '上海市测试路 126 号',
    phone: '021-12601260',
    businessHours: '09:00-21:00',
    adminEmail: `owner-w126-${stamp}@example.com`,
    adminName: 'W126 Owner',
    adminPassword: `W126-${stamp}-Password!`,
    industry: 'restaurant',
    plan: 'starter',
  };
  const headers = {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
    'x-request-id': randomUUID(),
    'idempotency-key': `w126-${stamp}`,
  };
  const createdRes = await fetch(`${base}/api/v1/platform/onboarding`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  assert.equal(createdRes.status, 201);
  const created = (await createdRes.json()).data;
  assert.equal(created.state, 'ready');
  assert.ok(created.verification.consumer_qr_ready);
  assert.ok(created.verification.owner_qr_ready);
  assert.ok(created.verification.employee_qr_ready);
  assert.ok(created.verification.one_code_ready);
  assert.equal(created.delivery.scenes?.length, 3);
  assert.deepEqual(
    created.delivery.scenes.map((s) => s.scene).sort(),
    [...SCENES].sort(),
  );
  assert.equal(created.delivery.oneCode, created.delivery.scenes.find((s) => s.scene === 'consumer_storefront').code);

  for (const scene of created.delivery.scenes) {
    assert.equal(scene.status, 'active');
    const resolved = await fetch(`${base}${scene.resolvePath}`);
    assert.equal(resolved.status, 200, `${scene.scene} must resolve`);
    const payload = (await resolved.json()).data;
    assert.equal(payload.tenant.slug, body.slug);
    assert.equal(payload.scene, scene.scene);
    assert.equal(payload.targetPath, scene.targetPath);
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const counts = await client.query(
      `select scene, count(*)::int as n
       from one_code_entries
       where tenant_id=$1 and status='active' and deleted_at is null
       group by scene
       order by scene`,
      [created.tenantId],
    );
    assert.deepEqual(
      counts.rows.map((r) => r.scene),
      [...SCENES].sort(),
    );
    assert.ok(counts.rows.every((r) => r.n === 1));
  } finally {
    await client.end();
  }

  const ownerScene = created.delivery.scenes.find((s) => s.scene === 'owner_activation');
  const revokeRes = await fetch(
    `${base}/api/v1/platform/onboarding/${created.runId}/delivery/revoke`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        'x-request-id': randomUUID(),
      },
      body: JSON.stringify({ scene: 'owner_activation' }),
    },
  );
  assert.equal(revokeRes.status, 201);
  const after = (await revokeRes.json()).data;
  const revoked = after.delivery.scenes.find((s) => s.scene === 'owner_activation');
  assert.equal(revoked.status, 'revoked');
  assert.equal((await fetch(`${base}${ownerScene.resolvePath}`)).status, 404);

  const consumerStill = created.delivery.scenes.find((s) => s.scene === 'consumer_storefront');
  assert.equal((await fetch(`${base}${consumerStill.resolvePath}`)).status, 200);
});
