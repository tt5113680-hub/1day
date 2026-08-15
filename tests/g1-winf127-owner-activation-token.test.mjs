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
const base = 'http://127.0.0.1:3269';
const systemTenant = '00000000-0000-4000-8000-000000000001';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

test('G1-W∞-127: static — activation token paths present', () => {
  const service = read('apps/api/src/platform-onboarding.service.ts');
  assert.match(service, /activationMode/);
  assert.match(service, /awaiting_activation/);
  assert.match(service, /owner_activation_tokens/);
  const auth = read('apps/api/src/auth.service.ts');
  assert.match(auth, /activateOwner/);
  assert.match(auth, /owner_activation_tokens/);
  const controller = read('apps/api/src/auth.controller.ts');
  assert.match(controller, /owner-activate/);
  const migration = read('packages/database/src/migrations/076_owner_activation_tokens.ts');
  assert.match(migration, /owner_activation_tokens/);
  const page = read('apps/platform-web/app/owner-activate/page.tsx');
  assert.match(page, /owner-activate/);
});

const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3269',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'g1-winf127-owner-activation',
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

test('G1-W∞-127: token mode awaits activation then READY after owner-activate', async () => {
  await ready();
  const platformToken = await login();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const body = {
    slug: `w127-${stamp}`,
    tenantName: `W127 Merchant ${stamp}`,
    organizationName: `W127 Org ${stamp}`,
    merchantName: `W127 Co ${stamp}`,
    storeName: `W127 Store ${stamp}`,
    address: '上海市测试路 127 号',
    phone: '021-12701270',
    businessHours: '09:00-21:00',
    adminEmail: `owner-w127-${stamp}@example.com`,
    adminName: 'W127 Owner',
    industry: 'restaurant',
    plan: 'starter',
    activationMode: 'token',
  };
  const createdRes = await fetch(`${base}/api/v1/platform/onboarding`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${platformToken}`,
      'content-type': 'application/json',
      'x-request-id': randomUUID(),
      'idempotency-key': `w127-${stamp}`,
    },
    body: JSON.stringify(body),
  });
  assert.equal(createdRes.status, 201);
  const created = (await createdRes.json()).data;
  assert.equal(created.state, 'awaiting_activation');
  assert.equal(created.delivery.activation?.mode, 'token');
  assert.ok(created.delivery.activation?.token);
  assert.equal(created.verification.owner_activated, false);
  assert.equal(created.steps.find((s) => s.code === 'ready_handoff')?.state, 'pending');

  const loginBefore = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: body.adminEmail,
      password: 'ShouldNotWorkYet12!',
      tenantId: created.tenantId,
    }),
  });
  assert.equal(loginBefore.status, 401);

  const ownerPassword = `W127-${stamp}-Password!`;
  const activateByToken = await fetch(`${base}/api/v1/auth/owner-activate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      token: created.delivery.activation.token,
      password: ownerPassword,
    }),
  });
  assert.equal(activateByToken.status, 201);
  const activated = await activateByToken.json();
  assert.equal(activated.state, 'ready');
  assert.equal(activated.tenantId, created.tenantId);
  assert.ok(activated.accessToken);

  const runRes = await fetch(`${base}/api/v1/platform/onboarding/${created.runId}`, {
    headers: {
      authorization: `Bearer ${platformToken}`,
      'x-request-id': randomUUID(),
    },
  });
  assert.equal(runRes.status, 200);
  const run = (await runRes.json()).data;
  assert.equal(run.state, 'ready');
  assert.equal(run.steps.find((s) => s.code === 'ready_handoff')?.state, 'succeeded');

  const loginAfter = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: body.adminEmail,
      password: ownerPassword,
      tenantId: created.tenantId,
    }),
  });
  assert.equal(loginAfter.status, 201);

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const tokens = await client.query(
      'select status from owner_activation_tokens where run_id=$1 and deleted_at is null',
      [created.runId],
    );
    assert.equal(tokens.rows[0]?.status, 'used');
    const user = await client.query(
      'select status, password_hash is not null as has_password from users where email=$1',
      [body.adminEmail],
    );
    assert.equal(user.rows[0].status, 'active');
    assert.equal(user.rows[0].has_password, true);
  } finally {
    await client.end();
  }

  const stamp2 = `${stamp}b`;
  const body2 = {
    ...body,
    slug: `w127-${stamp2}`,
    adminEmail: `owner-w127-${stamp2}@example.com`,
    tenantName: `W127 B ${stamp2}`,
    organizationName: `W127 Org B ${stamp2}`,
    storeName: `W127 Store B ${stamp2}`,
  };
  const created2Res = await fetch(`${base}/api/v1/platform/onboarding`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${platformToken}`,
      'content-type': 'application/json',
      'x-request-id': randomUUID(),
      'idempotency-key': `w127-${stamp2}`,
    },
    body: JSON.stringify(body2),
  });
  assert.equal(created2Res.status, 201);
  const created2 = (await created2Res.json()).data;
  const ownerScene = created2.delivery.scenes.find((s) => s.scene === 'owner_activation');
  const activateByCode = await fetch(`${base}/api/v1/auth/owner-activate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      code: ownerScene.code,
      password: `W127B-${stamp2}-Password!`,
    }),
  });
  assert.equal(activateByCode.status, 201);
  assert.equal((await activateByCode.json()).state, 'ready');
});
