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
const base = 'http://127.0.0.1:3270';
const systemTenant = '00000000-0000-4000-8000-000000000001';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

test('G1-W∞-128: static — foundation/commercial split + resume endpoint', () => {
  const service = read('apps/api/src/platform-onboarding.service.ts');
  assert.match(service, /provisionFoundation/);
  assert.match(service, /provisionCommercial/);
  assert.match(service, /finishCommercialPhase/);
  assert.match(service, /async resume\(/);
  assert.match(service, /failed_recoverable/);
  assert.match(service, /checkpoint/);
  const controller = read('apps/api/src/platform-onboarding.controller.ts');
  assert.match(controller, /:runId\/resume/);
  const page = read('apps/platform-web/app/p/tenants/new/page.tsx');
  assert.match(page, /provisioning-resume/);
});

const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3270',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'g1-winf128-mid-run-resume',
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

test('G1-W∞-128: commercial fail keeps foundation tenant; resume reaches READY', async () => {
  await ready();
  const token = await login();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const body = {
    slug: `w128-${stamp}`,
    tenantName: `W128 Merchant ${stamp}`,
    organizationName: `W128 Org ${stamp}`,
    merchantName: `W128 Co ${stamp}`,
    storeName: `W128 Store ${stamp}`,
    address: '上海市测试路 128 号',
    phone: '021-12801280',
    businessHours: '09:00-21:00',
    adminEmail: `owner-w128-${stamp}@example.com`,
    adminName: 'W128 Owner',
    adminPassword: `W128-${stamp}-Password!`,
    industry: 'restaurant',
    plan: 'starter',
    activationMode: 'password',
    testFailAtStep: 'industry_template',
  };
  const headers = {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
    'x-request-id': randomUUID(),
    'idempotency-key': `w128-fail-${stamp}`,
  };
  const failedRes = await fetch(`${base}/api/v1/platform/onboarding`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  assert.equal(failedRes.status, 201);
  const failed = (await failedRes.json()).data;
  assert.equal(failed.state, 'failed_recoverable');
  assert.ok(failed.tenantId, 'foundation tenant must remain after commercial failure');
  assert.equal(
    failed.steps.find((s) => s.code === 'organization_store')?.state,
    'succeeded',
  );
  assert.equal(
    failed.steps.find((s) => s.code === 'industry_template')?.state,
    'failed',
  );
  assert.equal(
    failed.steps.find((s) => s.code === 'ready_handoff')?.state,
    'pending',
  );

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const tenant = await client.query(
      "select slug,status from tenants where id=$1 and deleted_at is null",
      [failed.tenantId],
    );
    assert.equal(tenant.rows[0]?.slug, body.slug);
    assert.equal(tenant.rows[0]?.status, 'active');
    const templates = await client.query(
      "select count(*)::int as n from page_templates where tenant_id=$1 and deleted_at is null",
      [failed.tenantId],
    );
    assert.equal(templates.rows[0].n, 0, 'rolled-back commercial must not leave templates');
  } finally {
    await client.end();
  }

  const resumeRes = await fetch(`${base}/api/v1/platform/onboarding/${failed.runId}/resume`, {
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
  assert.equal(resumed.state, 'ready');
  assert.equal(resumed.tenantId, failed.tenantId);
  assert.ok(resumed.verification.one_code_ready);
  assert.equal(resumed.steps.find((s) => s.code === 'industry_template')?.state, 'succeeded');
  assert.equal(resumed.steps.find((s) => s.code === 'ready_handoff')?.state, 'succeeded');

  const loginOwner = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: body.adminEmail,
      password: body.adminPassword,
      tenantId: resumed.tenantId,
    }),
  });
  assert.equal(loginOwner.status, 201);
});
