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
const base = 'http://127.0.0.1:3271';
const systemTenant = '00000000-0000-4000-8000-000000000001';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

test('G1-W∞-129: static — worker heartbeat + outbox/worker verify keys', () => {
  const service = read('apps/api/src/platform-onboarding.service.ts');
  assert.match(service, /worker_health_recent/);
  assert.match(service, /outbox_clear/);
  assert.match(service, /needs_attention/);
  assert.match(service, /ensureWorkerHeartbeatForVerify/);
  assert.match(service, /worker_heartbeats/);
  const worker = read('apps/worker/src/index.ts');
  assert.match(worker, /persistHeartbeat/);
  assert.match(worker, /worker_heartbeats/);
  const migration = read('packages/database/src/migrations/077_worker_heartbeats.ts');
  assert.match(migration, /worker_heartbeats/);
  const page = read('apps/platform-web/app/p/tenants/new/page.tsx');
  assert.match(page, /provisioning-verification/);
  assert.match(page, /worker_health_recent/);
});

const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3271',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'g1-winf129-worker-outbox-health',
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

test('G1-W∞-129: READY verification includes outbox_clear + worker_health_recent', async () => {
  await ready();
  const token = await login();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const body = {
    slug: `w129-${stamp}`,
    tenantName: `W129 Merchant ${stamp}`,
    organizationName: `W129 Org ${stamp}`,
    merchantName: `W129 Co ${stamp}`,
    storeName: `W129 Store ${stamp}`,
    address: '上海市测试路 129 号',
    phone: '021-12901290',
    businessHours: '09:00-21:00',
    adminEmail: `owner-w129-${stamp}@example.com`,
    adminName: 'W129 Owner',
    adminPassword: `W129-${stamp}-Password!`,
    industry: 'restaurant',
    plan: 'starter',
    activationMode: 'password',
  };
  const res = await fetch(`${base}/api/v1/platform/onboarding`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'x-request-id': randomUUID(),
      'idempotency-key': `w129-${stamp}`,
    },
    body: JSON.stringify(body),
  });
  assert.equal(res.status, 201);
  const data = (await res.json()).data;
  assert.equal(data.state, 'ready');
  assert.equal(data.verification.outbox_clear, true);
  assert.equal(data.verification.worker_health_recent, true);
  assert.equal(data.verification.one_code_ready, true);

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  let poisonId = null;
  try {
    const hb = await client.query(
      "select status, last_run_at from worker_heartbeats where service_name='oneday-worker' and deleted_at is null",
    );
    assert.equal(hb.rows[0]?.status, 'ok');
    assert.ok(hb.rows[0]?.last_run_at);

    // Inject poison under a failed_recoverable merchant tenant, then resume must fail verify.
    const stamp2 = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const failInject = await fetch(`${base}/api/v1/platform/onboarding`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        'x-request-id': randomUUID(),
        'idempotency-key': `w129-inject-${stamp2}`,
      },
      body: JSON.stringify({
        ...body,
        slug: `w129i-${stamp2}`,
        adminEmail: `owner-w129i-${stamp2}@example.com`,
        adminPassword: `W129I-${stamp2}-Password!`,
        testFailAtStep: 'industry_template',
      }),
    });
    assert.equal(failInject.status, 201);
    const injected = (await failInject.json()).data;
    assert.equal(injected.state, 'failed_recoverable');
    assert.ok(injected.tenantId);

    poisonId = randomUUID();
    await client.query(
      `insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,status,attempts,available_at,last_error,created_by,updated_by)
       values($1,$2,'test.poison.v1','test',$3,'{}'::jsonb,$4,'w129-poison','pending',3,now()-interval '30 minutes','poison',$5,$5)`,
      [poisonId, injected.tenantId, randomUUID(), randomUUID(), systemTenant],
    );

    const resumeRes = await fetch(`${base}/api/v1/platform/onboarding/${injected.runId}/resume`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        'x-request-id': randomUUID(),
      },
      body: JSON.stringify({}),
    });
    assert.equal(resumeRes.status, 201);
    const resumed = (await resumeRes.json()).data;
    assert.equal(resumed.state, 'failed_recoverable');
    assert.match(String(resumed.errorDetail ?? ''), /READY_VERIFICATION_FAILED/);
  } finally {
    if (poisonId) {
      await client.query('delete from outbox_events where id=$1', [poisonId]);
    }
    await client.end();
  }
});
