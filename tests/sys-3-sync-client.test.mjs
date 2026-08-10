/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';
import { createSyncNotificationHandler, OutboxDispatcher } from '../packages/events/dist/index.js';
import { StorefrontSyncClient, TenantSyncClient } from '../packages/sync-client/dist/index.js';

const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const base = 'http://127.0.0.1:3263';
const systemTenant = '00000000-0000-4000-8000-000000000001';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');

const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3263',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'sys-3-sync-client',
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

async function login(email, password, tenantId) {
  const response = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, tenantId }),
  });
  assert.equal(response.status, 201);
  return (await response.json()).accessToken;
}

test.after(() => api.kill());

test('SYS-3: shared sync client detects authenticated and public storefront changes without hard refresh', async () => {
  await ready();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const slug = `sys3-${stamp}`;
  const email = `${slug}@example.test`;
  const password = `Sys3-${stamp}-Password!`;
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
      tenantName: `SYS3 ${stamp}`,
      organizationName: 'SYS3 HQ',
      merchantName: 'SYS3 Merchant',
      storeName: 'SYS3 Store',
      address: '3 Sync Road',
      phone: '021-55550300',
      businessHours: '09:00-21:00',
      adminName: 'SYS3 Owner',
      adminEmail: email,
      adminPassword: password,
      industry: 'restaurant',
      plan: 'starter',
    }),
  });
  assert.equal(provision.status, 201);
  const run = (await provision.json()).data;
  const ownerToken = await login(email, password, run.tenantId);
  const storeId = run.steps.find((step) => step.code === 'organization_store').output.storeId;

  const session = {
    async request(path, init = {}) {
      const headers = new Headers(init.headers);
      headers.set('authorization', `Bearer ${ownerToken}`);
      headers.set('x-tenant-context', run.tenantId);
      if (!headers.has('x-request-id')) headers.set('x-request-id', randomUUID());
      return fetch(path, { ...init, headers });
    },
  };
  const tenantClient = new TenantSyncClient(base, session);
  const baseline = await tenantClient.pollChanges(['operating', 'lifecycle']);
  assert.equal(baseline.status, 'modified');

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  const eventId = randomUUID();
  const correlationId = randomUUID();
  try {
    await client.query(
      `insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by)
       values($1,$2,'consumer.operating.projected.v1','consumer_operating_projection',$3,$4,$5,'sys3-sync',null,null)`,
      [eventId, run.tenantId, randomUUID(), { storeId, version: 1 }, correlationId],
    );
    const dispatcher = new OutboxDispatcher(
      databaseUrl,
      `sys3-sync-${stamp}`,
      createSyncNotificationHandler(databaseUrl),
      run.tenantId,
    );
    const dispatchResult = await dispatcher.dispatch(100);
    await dispatcher.close();
    assert.ok(dispatchResult.published >= 1);
  } finally {
    await client.end();
  }

  let sawChange = false;
  for (let i = 0; i < 20; i += 1) {
    const next = await tenantClient.pollChanges(['operating'], {
      etag: baseline.status === 'modified' ? baseline.etag : undefined,
    });
    if (next.status === 'modified' && next.changes.some((item) => item.eventId === eventId)) {
      sawChange = true;
      break;
    }
    await wait(100);
  }
  assert.equal(sawChange, true, 'TenantSyncClient must observe projected operating change');

  const storefront = new StorefrontSyncClient(base);
  const first = await storefront.pollVersion(slug, storeId);
  assert.equal(first.status, 'modified');
  const second = await storefront.pollVersion(slug, storeId, { etag: first.etag });
  assert.equal(second.status, 'not-modified');

  const owner = await login(email, password, run.tenantId);
  const templates = await fetch(`${base}/api/v1/page-templates`, {
    headers: {
      authorization: `Bearer ${owner}`,
      'x-tenant-context': run.tenantId,
      'x-request-id': randomUUID(),
    },
  });
  assert.equal(templates.status, 200);
  const template = (await templates.json()).data.find((item) => item.binding_id);
  assert.ok(template);
  const draftCreate = await fetch(`${base}/api/v1/page-templates/${template.id}/drafts`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${owner}`,
      'x-tenant-context': run.tenantId,
      'x-request-id': randomUUID(),
      'content-type': 'application/json',
    },
    body: JSON.stringify({ sourceVersionId: template.live_version_id }),
  });
  assert.equal(draftCreate.status, 201);
  const draft = (await draftCreate.json()).data;
  const modules = [
    { moduleType: 'store_hero', config: { emphasis: 'nearby_visit', visible: true } },
    { moduleType: 'store_info', config: { visible: true } },
  ];
  const update = await fetch(`${base}/api/v1/page-templates/${template.id}/drafts/${draft.id}`, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${owner}`,
      'x-tenant-context': run.tenantId,
      'x-request-id': randomUUID(),
      'content-type': 'application/json',
    },
    body: JSON.stringify({ version: draft.version ?? 1, modules }),
  });
  assert.equal(update.status, 200);
  const refreshed = await (
    await fetch(`${base}/api/v1/page-templates`, {
      headers: {
        authorization: `Bearer ${owner}`,
        'x-tenant-context': run.tenantId,
        'x-request-id': randomUUID(),
      },
    })
  ).json();
  const current = refreshed.data.find((item) => item.id === template.id);
  const publish = await fetch(`${base}/api/v1/page-templates/${template.id}/publish`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${owner}`,
      'x-tenant-context': run.tenantId,
      'x-request-id': randomUUID(),
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      versionId: draft.id,
      templateVersion: current.version,
      bindingVersion: current.binding_version,
    }),
  });
  assert.equal(publish.status, 201);

  let versionMoved = false;
  for (let i = 0; i < 20; i += 1) {
    const next = await storefront.pollVersion(slug, storeId, { etag: first.etag });
    if (
      next.status === 'modified' &&
      next.publishedVersion &&
      next.publishedVersion !== first.publishedVersion
    ) {
      versionMoved = true;
      break;
    }
    await wait(100);
  }
  assert.equal(
    versionMoved,
    true,
    'StorefrontSyncClient must observe publish without hard refresh',
  );
});
