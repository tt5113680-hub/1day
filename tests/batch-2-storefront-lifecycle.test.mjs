/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const base = 'http://127.0.0.1:3225';
const systemTenant = '00000000-0000-4000-8000-000000000001';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3225',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'batch-2-storefront-lifecycle',
  },
  stdio: 'ignore',
});
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function ready() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      // API process is starting.
    }
    await wait(100);
  }
  throw new Error('API did not start');
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

const protectedHeaders = (token, tenantId, extra = {}) => ({
  authorization: `Bearer ${token}`,
  'x-tenant-context': tenantId,
  'x-request-id': randomUUID(),
  'content-type': 'application/json',
  ...extra,
});

test.after(() => api.kill());

test('Storefront draft, same-renderer preview, publish and rollback keep live reads atomic', async () => {
  await ready();
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const slug = `storefront-${suffix}`;
  const ownerEmail = `storefront-${suffix}@example.test`;
  const ownerPassword = `Storefront-${suffix}-Password!`;
  const systemToken = await login('admin@system.local', 'ChangeMe123!', systemTenant);
  const provision = await fetch(`${base}/api/v1/platform/onboarding`, {
    method: 'POST',
    headers: protectedHeaders(systemToken, systemTenant, { 'idempotency-key': randomUUID() }),
    body: JSON.stringify({
      slug,
      tenantName: `Storefront ${suffix}`,
      organizationName: 'Storefront HQ',
      merchantName: 'Storefront Merchant',
      storeName: 'Storefront Main',
      address: '99 Storefront Road',
      phone: '021-55559999',
      businessHours: '09:00-21:00',
      adminName: 'Storefront Owner',
      adminEmail: ownerEmail,
      adminPassword: ownerPassword,
      industry: 'restaurant',
      plan: 'starter',
    }),
  });
  assert.equal(provision.status, 201);
  const run = (await provision.json()).data;
  assert.equal(run.state, 'ready');
  const ownerToken = await login(ownerEmail, ownerPassword, run.tenantId);

  const list = await fetch(`${base}/api/v1/page-templates`, {
    headers: protectedHeaders(ownerToken, run.tenantId),
  });
  assert.equal(list.status, 200);
  const template = (await list.json()).data.find((item) => item.binding_id);
  assert.ok(template);
  const v1 = template.live_version_id;

  const createDraft = await fetch(`${base}/api/v1/page-templates/${template.id}/drafts`, {
    method: 'POST',
    headers: protectedHeaders(ownerToken, run.tenantId),
    body: JSON.stringify({ sourceVersionId: v1 }),
  });
  assert.equal(createDraft.status, 201);
  const draft = (await createDraft.json()).data;
  assert.equal(draft.status, 'draft');
  assert.notEqual(draft.id, v1);

  const modules = [
    { moduleType: 'store_hero', config: { emphasis: 'campaign-v2', visible: true } },
    { moduleType: 'service_catalog', config: { presentation: 'menu', visible: true } },
    { moduleType: 'member_entry', config: { mode: 'enrollment', visible: true } },
    { moduleType: 'store_info', config: { visible: true } },
  ];
  const update = await fetch(`${base}/api/v1/page-templates/${template.id}/drafts/${draft.id}`, {
    method: 'PUT',
    headers: protectedHeaders(ownerToken, run.tenantId),
    body: JSON.stringify({ version: draft.version ?? 1, modules }),
  });
  assert.equal(update.status, 200);
  const updatedDraft = (await update.json()).data;
  assert.equal(updatedDraft.version, 2);

  const previewLink = await fetch(`${base}/api/v1/page-templates/${template.id}/preview-link`, {
    method: 'POST',
    headers: protectedHeaders(ownerToken, run.tenantId),
    body: JSON.stringify({ versionId: draft.id }),
  });
  assert.equal(previewLink.status, 201);
  const preview = (await previewLink.json()).data;
  const previewUrl = new URL(preview.path, 'http://consumer.local');
  const previewToken = previewUrl.searchParams.get('preview');
  assert.ok(previewToken);
  const previewRead = await fetch(
    `${base}/api/v1/consumer/stores/${template.store_id}?tenant=${slug}&preview=${previewToken}`,
  );
  assert.equal(previewRead.status, 200);
  const previewStorefront = (await previewRead.json()).data.storefront;
  assert.equal(previewStorefront.mode, 'preview');
  assert.equal(previewStorefront.templateVersionId, draft.id);
  assert.equal(previewStorefront.modules.length, modules.length);

  const liveBefore = await fetch(
    `${base}/api/v1/consumer/stores/${template.store_id}?tenant=${slug}`,
  );
  assert.equal(liveBefore.status, 200);
  assert.equal((await liveBefore.json()).data.storefront.templateVersionId, v1);

  const refreshedBeforePublish = await (
    await fetch(`${base}/api/v1/page-templates`, {
      headers: protectedHeaders(ownerToken, run.tenantId),
    })
  ).json();
  const beforePublish = refreshedBeforePublish.data.find((item) => item.id === template.id);
  const publish = await fetch(`${base}/api/v1/page-templates/${template.id}/publish`, {
    method: 'POST',
    headers: protectedHeaders(ownerToken, run.tenantId),
    body: JSON.stringify({
      versionId: draft.id,
      templateVersion: beforePublish.version,
      bindingVersion: beforePublish.binding_version,
    }),
  });
  assert.equal(publish.status, 201);
  const published = (await publish.json()).data;
  assert.equal(published.binding.live_version_id, draft.id);
  assert.equal(published.publicationType, 'publish');

  const liveAfter = await fetch(
    `${base}/api/v1/consumer/stores/${template.store_id}?tenant=${slug}`,
  );
  assert.equal(liveAfter.status, 200);
  const liveV2 = (await liveAfter.json()).data.storefront;
  assert.equal(liveV2.mode, 'published');
  assert.equal(liveV2.templateVersionId, draft.id);
  assert.equal(liveV2.modules.length, modules.length);

  const stale = await fetch(`${base}/api/v1/page-templates/${template.id}/publish`, {
    method: 'POST',
    headers: protectedHeaders(ownerToken, run.tenantId),
    body: JSON.stringify({
      versionId: v1,
      templateVersion: beforePublish.version,
      bindingVersion: beforePublish.binding_version,
    }),
  });
  assert.equal(stale.status, 409);

  const refreshedBeforeRollback = await (
    await fetch(`${base}/api/v1/page-templates`, {
      headers: protectedHeaders(ownerToken, run.tenantId),
    })
  ).json();
  const beforeRollback = refreshedBeforeRollback.data.find((item) => item.id === template.id);
  const rollback = await fetch(`${base}/api/v1/page-templates/${template.id}/rollback`, {
    method: 'POST',
    headers: protectedHeaders(ownerToken, run.tenantId),
    body: JSON.stringify({
      versionId: v1,
      templateVersion: beforeRollback.version,
      bindingVersion: beforeRollback.binding_version,
    }),
  });
  assert.equal(rollback.status, 201);
  assert.equal((await rollback.json()).data.publicationType, 'rollback');
  const liveRolledBack = await fetch(
    `${base}/api/v1/consumer/stores/${template.store_id}?tenant=${slug}`,
  );
  assert.equal((await liveRolledBack.json()).data.storefront.templateVersionId, v1);
  assert.equal(
    (
      await fetch(
        `${base}/api/v1/consumer/stores/${template.store_id}?tenant=${slug}&preview=invalid-preview-token-000000`,
      )
    ).status,
    404,
  );

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const evidence = await client.query(
      `select
        (select count(*) from storefront_publications where tenant_id=$1 and binding_id=$2)::int publications,
        (select count(*) from outbox_events where tenant_id=$1 and event_type in ('storefront.published.v1','storefront.rolled_back.v1') and aggregate_id=$2)::int events,
        (select count(*) from audit_logs where tenant_id=$1 and action in ('storefront.draft_updated','storefront.preview_created'))::int audits`,
      [run.tenantId, template.binding_id],
    );
    assert.deepEqual(evidence.rows[0], { publications: 3, events: 3, audits: 2 });
  } finally {
    await client.end();
  }
});
