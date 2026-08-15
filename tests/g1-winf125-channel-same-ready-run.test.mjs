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
const base = 'http://127.0.0.1:3267';
const systemTenant = '00000000-0000-4000-8000-000000000001';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

test('G1-W∞-125: channel onboarding delegates to platform READY service (static)', () => {
  const service = read('apps/api/src/channel-merchant-onboarding.service.ts');
  assert.match(service, /PlatformOnboardingService/);
  assert.match(service, /channel_referral/);
  assert.match(service, /channel-ready:/);
  assert.match(service, /READY_REQUIRED/);
  assert.doesNotMatch(service, /scryptSync/);
  assert.doesNotMatch(service, /insert into tenants\(/);
});

test('G1-W∞-125: platform channel_circle writes real membership for channel_referral', () => {
  const service = read('apps/api/src/platform-onboarding.service.ts');
  assert.match(service, /channelId/);
  assert.match(service, /platform_channel_merchants/);
  assert.match(service, /CHANNEL_NOT_AVAILABLE/);
});

const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3267',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'g1-winf125-channel-ready',
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

test('G1-W∞-125: channel create → READY run + channel membership; delivered requires READY', async () => {
  await ready();
  const token = await login();
  const headers = {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
    'x-request-id': randomUUID(),
  };
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

  const channels = await fetch(`${base}/api/v1/platform/channels`, { headers });
  assert.equal(channels.status, 200);
  let channelId = (await channels.json()).data?.channels?.[0]?.id;
  if (!channelId) {
    const created = await fetch(`${base}/api/v1/platform/channels`, {
      method: 'POST',
      headers: { ...headers, 'idempotency-key': randomUUID() },
      body: JSON.stringify({
        code: `w125-ch-${stamp}`,
        name: `W125 Channel ${stamp}`,
        merchantTenantId: systemTenant,
        onboardingStatus: 'invited',
        serviceStatus: 'pending',
      }),
    });
    assert.equal(created.status, 201);
    channelId = (await created.json()).data.id;
  }

  const key = randomUUID();
  const create = await fetch(`${base}/api/v1/channel/merchant-onboardings`, {
    method: 'POST',
    headers: { ...headers, 'idempotency-key': key },
    body: JSON.stringify({
      channelId,
      slug: `w125-m-${stamp}`,
      tenantName: `W125 Merchant ${stamp}`,
      organizationName: `W125 HQ ${stamp}`,
      storeName: `W125 Store ${stamp}`,
      adminName: 'W125 Owner',
      adminEmail: `w125-owner-${stamp}@example.test`,
      adminPassword: `W125-${stamp}-Password!`,
      template: 'starter',
      plan: 'starter',
    }),
  });
  assert.equal(create.status, 201);
  const createdBody = (await create.json()).data;
  assert.equal(createdBody.provisioningState, 'ready');
  assert.ok(createdBody.runId);
  assert.ok(createdBody.tenantId);
  assert.ok(Array.isArray(createdBody.steps));
  assert.ok(createdBody.steps.some((s) => s.code === 'channel_circle' && s.state === 'succeeded'));
  assert.ok(createdBody.steps.some((s) => s.code === 'ready_handoff' && s.state === 'succeeded'));

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const run = (
      await client.query(
        "select state,source_mode from tenant_provisioning_runs where id=$1 and deleted_at is null",
        [createdBody.runId],
      )
    ).rows[0];
    assert.equal(run.state, 'ready');
    assert.equal(run.source_mode, 'channel_referral');
    const membership = (
      await client.query(
        'select count(*)::int c from platform_channel_merchants where channel_id=$1 and merchant_tenant_id=$2 and deleted_at is null',
        [channelId, createdBody.tenantId],
      )
    ).rows[0].c;
    assert.equal(membership, 1);
    const storefront = (
      await client.query(
        "select count(*)::int c from storefront_bindings where tenant_id=$1 and status='active' and deleted_at is null",
        [createdBody.tenantId],
      )
    ).rows[0].c;
    assert.ok(storefront >= 1);
  } finally {
    await client.end();
  }

  // Idempotent replay
  const replay = await fetch(`${base}/api/v1/channel/merchant-onboardings`, {
    method: 'POST',
    headers: { ...headers, 'idempotency-key': key, 'x-request-id': randomUUID() },
    body: JSON.stringify({
      channelId,
      slug: `w125-m-${stamp}`,
      tenantName: `W125 Merchant ${stamp}`,
      organizationName: `W125 HQ ${stamp}`,
      storeName: `W125 Store ${stamp}`,
      adminName: 'W125 Owner',
      adminEmail: `w125-owner-${stamp}@example.test`,
      adminPassword: `W125-${stamp}-Password!`,
      template: 'starter',
      plan: 'starter',
    }),
  });
  assert.equal(replay.status, 201);
  assert.equal((await replay.json()).data.id, createdBody.id);

  // Delivery succeeds after READY
  const list = await fetch(`${base}/api/v1/channel/merchant-onboardings`, {
    headers: { ...headers, 'x-request-id': randomUUID() },
  });
  assert.equal(list.status, 200);
  const row = (await list.json()).data.find((x) => x.id === createdBody.id);
  assert.ok(row);
  assert.equal(row.provisioningState, 'ready');
  const delivered = await fetch(`${base}/api/v1/channel/merchant-onboardings/${createdBody.id}/delivery`, {
    method: 'POST',
    headers: { ...headers, 'idempotency-key': randomUUID(), 'x-request-id': randomUUID() },
    body: JSON.stringify({ status: 'delivered', note: 'handoff after READY', version: row.version }),
  });
  assert.equal(delivered.status, 201);
  assert.equal((await delivered.json()).data.delivery_status, 'delivered');
});
