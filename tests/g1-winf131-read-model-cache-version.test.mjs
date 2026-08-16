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
const base = 'http://127.0.0.1:3273';
const systemTenant = '00000000-0000-4000-8000-000000000001';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

test('G1-W∞-131: static — read-model cache + verify keys', () => {
  const service = read('apps/api/src/platform-onboarding.service.ts');
  assert.match(service, /published_read_consistent/);
  assert.match(service, /preview_published_distinguishable/);
  assert.match(service, /cache_version_consistent/);
  assert.match(service, /warmStorefrontReadModelCache/);
  assert.match(service, /storefront_preview_tokens/);
  const helper = read('apps/api/src/storefront-read-model-cache.ts');
  assert.match(helper, /storefrontPublishedFingerprint/);
  assert.match(helper, /warmStorefrontReadModelCache/);
  const migration = read('packages/database/src/migrations/078_storefront_read_model_cache.ts');
  assert.match(migration, /storefront_read_model_cache/);
  const page = read('apps/platform-web/app/p/tenants/new/page.tsx');
  assert.match(page, /published_read_consistent/);
  assert.match(page, /cache_version_consistent/);
  assert.match(page, /provisioning-storefront-cache/);
});

const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3273',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'g1-winf131-read-model-cache',
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

test('G1-W∞-131: READY asserts read-model/cache; Consumer published≠preview', async () => {
  await ready();
  const token = await login();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const body = {
    slug: `w131-${stamp}`,
    tenantName: `W131 Merchant ${stamp}`,
    organizationName: `W131 Org ${stamp}`,
    merchantName: `W131 Co ${stamp}`,
    storeName: `W131 Store ${stamp}`,
    address: '上海市测试路 131 号',
    phone: '021-13101310',
    businessHours: '09:00-21:00',
    adminEmail: `owner-w131-${stamp}@example.com`,
    adminName: 'W131 Owner',
    adminPassword: `W131-${stamp}-Password!`,
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
      'idempotency-key': `w131-${stamp}`,
    },
    body: JSON.stringify(body),
  });
  assert.equal(res.status, 201);
  const data = (await res.json()).data;
  assert.equal(data.state, 'ready');
  assert.equal(data.verification.published_read_consistent, true);
  assert.equal(data.verification.preview_published_distinguishable, true);
  assert.equal(data.verification.cache_version_consistent, true);
  assert.equal(data.verification.storefront_published, true);
  assert.ok(data.delivery.storefront?.publishedVersion);
  assert.ok(data.delivery.storefront?.previewPath?.includes('preview='));
  assert.ok(data.delivery.storefront?.etag);

  const storeId = data.tenantId
    ? (
        await (async () => {
          const client = new Client({ connectionString: databaseUrl });
          await client.connect();
          try {
            const row = await client.query(
              'select id from stores where tenant_id=$1 and deleted_at is null limit 1',
              [data.tenantId],
            );
            return row.rows[0].id;
          } finally {
            await client.end();
          }
        })()
      )
    : null;
  assert.ok(storeId);

  const published = await fetch(
    `${base}/api/v1/consumer/stores/${storeId}?tenant=${encodeURIComponent(body.slug)}`,
  );
  assert.equal(published.status, 200);
  const publishedBody = (await published.json()).data;
  assert.equal(publishedBody.storefront.mode, 'published');
  assert.equal(publishedBody.storefront.templateVersionId, data.delivery.storefront.liveVersionId);

  const previewToken = new URL(
    data.delivery.storefront.previewPath,
    'http://local.test',
  ).searchParams.get('preview');
  assert.ok(previewToken);
  const preview = await fetch(
    `${base}/api/v1/consumer/stores/${storeId}?tenant=${encodeURIComponent(body.slug)}&preview=${encodeURIComponent(previewToken)}`,
  );
  assert.equal(preview.status, 200);
  const previewBody = (await preview.json()).data;
  assert.equal(previewBody.storefront.mode, 'preview');
  assert.equal(previewBody.storefront.templateVersionId, data.delivery.storefront.draftVersionId);
  assert.notEqual(
    previewBody.storefront.templateVersionId,
    publishedBody.storefront.templateVersionId,
  );

  const sync = await fetch(
    `${base}/api/v1/public/sync/storefront?tenant=${encodeURIComponent(body.slug)}&storeId=${storeId}`,
    { headers: { 'x-request-id': randomUUID() } },
  );
  assert.equal(sync.status, 200);
  const syncBody = (await sync.json()).data;
  assert.equal(syncBody.publishedVersion, data.delivery.storefront.publishedVersion);
  assert.equal(syncBody.etag, data.delivery.storefront.etag);

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const cache = await client.query(
      'select published_version,etag,cache_version,live_version_id from storefront_read_model_cache where store_id=$1 and deleted_at is null',
      [storeId],
    );
    assert.equal(cache.rows[0]?.published_version, data.delivery.storefront.publishedVersion);
    assert.equal(cache.rows[0]?.etag, data.delivery.storefront.etag);
    assert.equal(Number(cache.rows[0]?.cache_version), data.delivery.storefront.cacheVersion);
  } finally {
    await client.end();
  }
});
