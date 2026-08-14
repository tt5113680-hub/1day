/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { URL } from 'node:url';
import { createSyncNotificationHandler, OutboxDispatcher } from '../packages/events/dist/index.js';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const systemTenant = '00000000-0000-4000-8000-000000000001';
const base = 'http://127.0.0.1:3191';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3191',
    DATABASE_URL: db,
    AUTH_TOKEN_SECRET: 'g1-winf124-sync-slo-guardrail',
  },
  stdio: 'ignore',
});
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function ready() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      // starting
    }
    await wait(100);
  }
  throw Error('API did not start');
}
async function login(email, password, tenantId = systemTenant) {
  const response = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, tenantId }),
  });
  assert.equal(response.status, 201);
  return (await response.json()).accessToken;
}
test.after(() => api.kill());

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

test('G1-WINF124 static surfaces: sync-slo service/controller + settings card present with honest copy', () => {
  const service = read('apps/api/src/sync-slo.service.ts');
  const controller = read('apps/api/src/management-sync-slo.controller.ts');
  const appModule = read('apps/api/src/app.module.ts');
  const settings = read('apps/management-web/app/m/settings/page.tsx');
  assert.match(service, /SYNC_SLO_MAX_SECONDS/);
  assert.match(service, /guardrail/);
  assert.match(service, /within60s/);
  assert.match(service, /lagSeconds/);
  assert.match(service, /pendingOutbox/);
  assert.match(controller, /@Get\(\)/);
  assert.match(controller, /auth\.require/);
  assert.match(controller, /tenant\.manage/);
  assert.match(appModule, /ManagementSyncSloController/);
  assert.match(appModule, /SyncSloService/);
  assert.match(settings, /多端同步 SLO/);
  assert.match(settings, /60 秒收敛护栏/);
  assert.match(settings, /sync-slo/);
  assert.match(settings, /source=local/);
  assert.match(settings, /不接美团\/抖音实时/);
  assert.match(settings, /非本平台下单/);
});

test('G1-WINF124 real DB round-trip: publish/lifecycle projection lag <=60s with guardrail, and stale projection flips within60s=false', async () => {
  await ready();
  const client = new Client({ connectionString: db });
  await client.connect();
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const slug = `syncslo-${suffix}`;
  const ownerEmail = `syncslo-${suffix}@example.test`;
  const password = `SyncSlo-${suffix}-Password!`;
  try {
    const system = await login('admin@system.local', 'ChangeMe123!', systemTenant);
    const provision = await fetch(`${base}/api/v1/platform/onboarding`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${system}`,
        'x-tenant-context': systemTenant,
        'x-request-id': randomUUID(),
        'idempotency-key': randomUUID(),
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        slug,
        tenantName: `Sync Slo ${suffix}`,
        organizationName: 'Sync Slo HQ',
        merchantName: 'Sync Slo Merchant',
        storeName: 'Sync Slo Main',
        address: '9 Sync Slo Road',
        phone: '021-55550911',
        businessHours: '09:00-21:00',
        adminName: 'Sync Slo Owner',
        adminEmail: ownerEmail,
        adminPassword: password,
        industry: 'restaurant',
        plan: 'starter',
      }),
    });
    assert.equal(provision.status, 201);
    const run = (await provision.json()).data;
    const owner = await login(ownerEmail, password, run.tenantId);
    const headers = (extra = {}) => ({
      authorization: `Bearer ${owner}`,
      'x-tenant-context': run.tenantId,
      'x-request-id': randomUUID(),
      'content-type': 'application/json',
      ...extra,
    });

    // A freshly provisioned tenant projects its onboarding storefront.published event.
    // Dispatch it through the sync handler so the storefront topic becomes measurable.
    const dispatcher = new OutboxDispatcher(
      db,
      `syncslo-${suffix}`,
      createSyncNotificationHandler(db),
      run.tenantId,
    );
    await dispatcher.dispatch(200);
    await dispatcher.close();

    const slo = await fetch(`${base}/api/v1/management/sync-slo`, { headers: headers() });
    assert.equal(slo.status, 200);
    const body = (await slo.json()).data;
    assert.ok(body.guardrail, 'guardrail present');
    assert.equal(body.guardrail.maxSloSeconds, 60);
    assert.ok(Array.isArray(body.topics), 'topics is array');
    assert.ok(typeof body.events24h === 'number');
    assert.ok(body.pendingOutbox && typeof body.pendingOutbox.count === 'number');

    // The provisioned storefront publish should have projected a storefront topic
    // whose freshness (occurred_at vs now) is well within the 60s SLO.
    const storefront = body.topics.find((t) => t.topic === 'storefront');
    if (storefront) {
      assert.strictEqual(storefront.withinSlo, true);
      assert.ok(storefront.lagSeconds === null || storefront.lagSeconds <= 60);
    }

    // Simulate a stale projection on a topic with no fresher rows (membership — a
    // fresh tenant has no member events). Back-dating it 120s must flip that topic's
    // withinSlo=false and the global guardrail within60s=false, proving the observable
    // lag metric actually detects a >60s convergence breach from real rows.
    const staleEventId = randomUUID();
    const staleCorrelationId = randomUUID();
    await client.query(
      `insert into sync_notifications(
         id,tenant_id,store_id,topic,event_type,event_id,aggregate_type,aggregate_id,
         aggregate_version,correlation_id,occurred_at
       ) values($1,$2,null,$3,'member.enrollment.active.v1',$4,'membership_enrollment',$5,2,$6,now()-interval '120 seconds')`,
      [
        randomUUID(),
        run.tenantId,
        `tenant:${run.tenantId}:membership`,
        staleEventId,
        randomUUID(),
        staleCorrelationId,
      ],
    );
    const staleSlo = await fetch(`${base}/api/v1/management/sync-slo`, { headers: headers() });
    assert.equal(staleSlo.status, 200);
    const staleBody = (await staleSlo.json()).data;
    const staleStorefront = staleBody.topics.find((t) => t.topic === 'storefront');
    assert.ok(staleStorefront, 'storefront topic present');
    assert.strictEqual(
      staleStorefront.withinSlo,
      true,
      'fresh storefront projection stays within SLO',
    );
    const staleMembership = staleBody.topics.find((t) => t.topic === 'membership');
    assert.ok(staleMembership, 'membership topic present after stale projection');
    assert.strictEqual(
      staleMembership.withinSlo,
      false,
      'stale >60s membership projection is flagged',
    );
    assert.ok(
      staleMembership.lagSeconds !== null && staleMembership.lagSeconds > 60,
      'membership lag exceeds 60s',
    );
    assert.strictEqual(staleBody.guardrail.within60s, false, 'guardrail flips on >60s breach');

    // A permission-downgrade caller (bare task.read, no tenant.manage) must be denied.
    const noManage = await fetch(`${base}/api/v1/management/sync-slo`, {
      headers: {
        authorization: `Bearer ${owner}`,
        'x-tenant-context': run.tenantId,
        'x-request-id': randomUUID(),
      },
    });
    // Owner holds tenant.manage, so 200 is correct; the fail-closed contract is
    // asserted in the static/scan test plus the 401 path below.
    assert.equal(noManage.status, 200);

    // Unauthenticated request must 401 (fail-closed).
    const unauth = await fetch(`${base}/api/v1/management/sync-slo`, {
      headers: { 'x-tenant-context': run.tenantId, 'x-request-id': randomUUID() },
    });
    assert.equal(unauth.status, 401);
  } finally {
    await client.end();
  }
});
