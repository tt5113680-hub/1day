/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';
import { createSyncNotificationHandler, OutboxDispatcher } from '../packages/events/dist/index.js';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const apiBase = 'http://127.0.0.1:3341';
const systemTenant = '00000000-0000-4000-8000-000000000001';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3341',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'matrix-sync-gateway',
  },
  stdio: 'ignore',
});

async function ready(url) {
  for (let i = 0; i < 50; i += 1) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // starting
    }
    await wait(100);
  }
  throw Error(`service not ready: ${url}`);
}

async function login(email, password, tenantId) {
  const response = await fetch(`${apiBase}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, tenantId }),
  });
  assert.equal(response.status, 201);
  return (await response.json()).accessToken;
}

function authHeaders(token, tenantId, extra = {}) {
  return {
    authorization: `Bearer ${token}`,
    'x-tenant-context': tenantId,
    'x-request-id': randomUUID(),
    ...extra,
  };
}

test.after(() => api.kill());

test('SY-01/SY-02 sync gateway projects operating and lifecycle topics with ETag poll fallback', async () => {
  await ready(`${apiBase}/api/v1/health`);
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const slug = `sync-${suffix}`;
  const email = `${slug}@example.test`;
  const password = `Sync-${suffix}-Password!`;
  try {
    const system = await login('admin@system.local', 'ChangeMe123!', systemTenant);
    const provision = await fetch(`${apiBase}/api/v1/platform/onboarding`, {
      method: 'POST',
      headers: {
        ...authHeaders(system, systemTenant),
        'idempotency-key': randomUUID(),
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        slug,
        tenantName: `Sync ${suffix}`,
        organizationName: 'Sync HQ',
        merchantName: 'Sync Merchant',
        storeName: 'Sync Store',
        address: '1 Sync Road',
        phone: '021-55550111',
        businessHours: '09:00-21:00',
        adminName: 'Sync Owner',
        adminEmail: email,
        adminPassword: password,
        industry: 'restaurant',
        plan: 'starter',
      }),
    });
    assert.equal(provision.status, 201);
    const run = (await provision.json()).data;
    const owner = await login(email, password, run.tenantId);
    const storeId = run.steps.find((step) => step.code === 'organization_store').output.storeId;
    const eventId = randomUUID();
    const correlationId = randomUUID();
    await client.query(
      `insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by)
       values($1,$2,'consumer.operating.projected.v1','consumer_operating_projection',$3,$4,$5,'matrix-sync',null,null)`,
      [eventId, run.tenantId, randomUUID(), { storeId, version: 1 }, correlationId],
    );

    const dispatcher = new OutboxDispatcher(
      databaseUrl,
      `matrix-sync-${suffix}`,
      createSyncNotificationHandler(databaseUrl),
      run.tenantId,
    );
    const dispatchResult = await dispatcher.dispatch(100);
    await dispatcher.close();
    assert.ok(dispatchResult.published >= 1);

    const response = await fetch(
      `${apiBase}/api/v1/sync/changes?topics=operating,lifecycle,storefront`,
      { headers: authHeaders(owner, run.tenantId) },
    );
    assert.equal(response.status, 200);
    const changes = await response.json();
    assert.ok(changes.data.changes.some((item) => item.eventId === eventId));
    assert.equal(changes.data.pollAfterSeconds, 30);
    const etag = response.headers.get('etag');
    assert.ok(etag);
    const cached = await fetch(
      `${apiBase}/api/v1/sync/changes?topics=operating,lifecycle,storefront`,
      { headers: authHeaders(owner, run.tenantId, { 'if-none-match': etag }) },
    );
    assert.equal(cached.status, 304);

    const publicVersion = await fetch(
      `${apiBase}/api/v1/public/sync/storefront?tenant=${slug}&storeId=${storeId}`,
      { headers: { 'x-request-id': randomUUID() } },
    );
    assert.equal(publicVersion.status, 200);
    const published = (await publicVersion.json()).data;
    assert.ok(published.publishedVersion);
    assert.equal(published.pollAfterSeconds, 30);
    const publicEtag = publicVersion.headers.get('etag');
    const publicCached = await fetch(
      `${apiBase}/api/v1/public/sync/storefront?tenant=${slug}&storeId=${storeId}`,
      { headers: { 'x-request-id': randomUUID(), 'if-none-match': publicEtag } },
    );
    assert.equal(publicCached.status, 304);

    const tenantRow = await client.query('select version from tenants where id=$1', [run.tenantId]);
    const suspend = await fetch(`${apiBase}/api/v1/platform/tenants/${run.tenantId}`, {
      method: 'PUT',
      headers: {
        ...authHeaders(system, systemTenant),
        'idempotency-key': randomUUID(),
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        version: tenantRow.rows[0].version,
        plan: 'starter',
        riskLevel: 'low',
        quotas: { users: 10, customers: 1000, stores: 3 },
        status: 'suspended',
        confirmation: `SUSPEND:${slug}`,
      }),
    });
    assert.equal(suspend.status, 200);
    const suspended = (await suspend.json()).data;
    assert.equal(suspended.status, 'suspended');
    assert.ok(suspended.authEpoch >= 1);

    const lifecycleDispatcher = new OutboxDispatcher(
      databaseUrl,
      `matrix-sync-lifecycle-${suffix}`,
      createSyncNotificationHandler(databaseUrl),
      run.tenantId,
    );
    await lifecycleDispatcher.dispatch(100);
    await lifecycleDispatcher.close();

    const lifecycle = await client.query(
      `select topic,event_type from sync_notifications
       where tenant_id=$1 and event_type='tenant.lifecycle.changed.v1'`,
      [run.tenantId],
    );
    assert.ok(lifecycle.rowCount >= 1);
    assert.ok(lifecycle.rows.some((row) => String(row.topic).endsWith(':lifecycle')));
  } finally {
    await client.end();
  }
});
