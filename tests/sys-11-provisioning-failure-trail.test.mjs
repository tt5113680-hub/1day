/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const base = 'http://127.0.0.1:3299';
const systemTenantId = '00000000-0000-4000-8000-000000000001';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3299',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'sys-11-provisioning-failure',
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
      tenantId: systemTenantId,
    }),
  });
  assert.equal(response.status, 201);
  return (await response.json()).accessToken;
}

test.after(() => api.kill());

test('SYS-11: failed run GET exposes step trail; READY steps are not labeled skip', async () => {
  await ready();
  const token = await login();
  const headers = {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
    'x-request-id': randomUUID(),
  };

  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const slug = `sys11-ready-${stamp}`;
  const created = await fetch(`${base}/api/v1/platform/onboarding`, {
    method: 'POST',
    headers: { ...headers, 'idempotency-key': randomUUID() },
    body: JSON.stringify({
      slug,
      tenantName: `SYS11 ${stamp}`,
      organizationName: 'SYS11 HQ',
      merchantName: 'SYS11 Merchant',
      storeName: 'SYS11 Store',
      address: 'SYS11 Road 1',
      phone: '021-1100',
      businessHours: '09:00-21:00',
      adminName: 'Owner',
      adminEmail: `sys11-${stamp}@example.local`,
      adminPassword: 'ChangeMe123!',
      industry: 'retail',
      plan: 'starter',
    }),
  });
  assert.equal(created.status, 201);
  const readyRun = (await created.json()).data;
  assert.equal(readyRun.state, 'ready');
  assert.ok(readyRun.steps.length >= 1);
  assert.ok(readyRun.steps.every((step) => step.state === 'succeeded' || step.state === 'skipped'));

  const failedId = randomUUID();
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(
      "insert into tenant_provisioning_runs(id,requested_by_tenant_id,source_mode,request_slug,idempotency_key,state,industry,plan,input,correlation_id,error_code,error_detail,created_by,updated_by) values($1,$2,'platform_direct',$3,$4,'failed_recoverable','retail','starter','{}',$5,'PROVISIONING_FAILED','simulated failure for SYS-11',null,null)",
      [failedId, systemTenantId, `sys11-fail-${stamp}`, randomUUID(), randomUUID()],
    );
    const codes = [
      'validate_reserve',
      'tenant_foundation',
      'owner_role_packs',
      'organization_store',
      'industry_template',
      'storefront_publish',
      'commercial_defaults',
      'channel_circle',
      'one_code_delivery',
      'activate_verify',
      'ready_handoff',
    ];
    for (const [position, code] of codes.entries()) {
      await client.query(
        'insert into tenant_provisioning_steps(id,run_id,step_code,position,state,attempts,error_code,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,null,null)',
        [
          randomUUID(),
          failedId,
          code,
          position,
          position === 0 ? 'failed' : 'pending',
          position === 0 ? 1 : 0,
          position === 0 ? 'PROVISIONING_FAILED' : null,
        ],
      );
    }
  } finally {
    await client.end();
  }

  const failed = await fetch(`${base}/api/v1/platform/onboarding/${failedId}`, { headers });
  assert.equal(failed.status, 200);
  const failedRun = (await failed.json()).data;
  assert.equal(failedRun.state, 'failed_recoverable');
  assert.equal(failedRun.errorCode, 'PROVISIONING_FAILED');
  assert.ok(failedRun.errorDetail);
  assert.equal(failedRun.steps[0].state, 'failed');
  assert.ok(failedRun.steps.slice(1).every((step) => step.state === 'pending'));
});
