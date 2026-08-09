/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

const base = 'http://127.0.0.1:3260';
const systemTenant = '00000000-0000-4000-8000-000000000001';
const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3260',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'storefront-module-renderer',
  },
  stdio: 'ignore',
});
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const headers = (token, tenant, more = {}) => ({
  authorization: `Bearer ${token}`,
  'x-tenant-context': tenant,
  'x-request-id': randomUUID(),
  'content-type': 'application/json',
  ...more,
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
  throw Error('API did not start');
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

test('published module order and visibility project to Consumer storefront.modules', async () => {
  await ready();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const slug = `mod-${stamp}`;
  const email = `${slug}@example.test`;
  const password = `Module-${stamp}-Password!`;
  const system = await login('admin@system.local', 'ChangeMe123!', systemTenant);
  const provision = await fetch(`${base}/api/v1/platform/onboarding`, {
    method: 'POST',
    headers: headers(system, systemTenant, { 'idempotency-key': randomUUID() }),
    body: JSON.stringify({
      slug,
      tenantName: `Module ${stamp}`,
      organizationName: 'Module HQ',
      merchantName: 'Module Merchant',
      storeName: 'Module Store',
      address: '77 Module Road',
      phone: '021-55557700',
      businessHours: '09:00-21:00',
      adminName: 'Module Owner',
      adminEmail: email,
      adminPassword: password,
      industry: 'restaurant',
      plan: 'starter',
    }),
  });
  assert.equal(provision.status, 201);
  const run = (await provision.json()).data;
  assert.equal(run.state, 'ready');
  const owner = await login(email, password, run.tenantId);
  const list = await fetch(`${base}/api/v1/page-templates`, {
    headers: headers(owner, run.tenantId),
  });
  assert.equal(list.status, 200);
  const template = (await list.json()).data.find((item) => item.binding_id);
  assert.ok(template);
  const draftCreate = await fetch(`${base}/api/v1/page-templates/${template.id}/drafts`, {
    method: 'POST',
    headers: headers(owner, run.tenantId),
    body: JSON.stringify({ sourceVersionId: template.live_version_id }),
  });
  assert.equal(draftCreate.status, 201);
  const draft = (await draftCreate.json()).data;
  const modules = [
    { moduleType: 'store_hero', config: { emphasis: 'nearby_visit', visible: true } },
    { moduleType: 'content_feed', config: { kind: 'store_story', visible: true } },
    { moduleType: 'quick_actions', config: { capabilities: ['consult', 'phone'], visible: true } },
    { moduleType: 'banner_carousel', config: { limit: 2, visible: false } },
    { moduleType: 'service_catalog', config: { presentation: 'menu', visible: true } },
    { moduleType: 'store_info', config: { visible: true } },
  ];
  const update = await fetch(`${base}/api/v1/page-templates/${template.id}/drafts/${draft.id}`, {
    method: 'PUT',
    headers: headers(owner, run.tenantId),
    body: JSON.stringify({ version: draft.version ?? 1, modules }),
  });
  assert.equal(update.status, 200);
  const refreshed = await (
    await fetch(`${base}/api/v1/page-templates`, { headers: headers(owner, run.tenantId) })
  ).json();
  const current = refreshed.data.find((item) => item.id === template.id);
  const publish = await fetch(`${base}/api/v1/page-templates/${template.id}/publish`, {
    method: 'POST',
    headers: headers(owner, run.tenantId),
    body: JSON.stringify({
      versionId: draft.id,
      templateVersion: current.version,
      bindingVersion: current.binding_version,
    }),
  });
  assert.equal(publish.status, 201);
  const live = await fetch(
    `${base}/api/v1/consumer/stores/${template.store_id}?tenant=${encodeURIComponent(slug)}`,
  );
  assert.equal(live.status, 200);
  const storefront = (await live.json()).data.storefront;
  assert.equal(storefront.mode, 'published');
  assert.deepEqual(
    storefront.modules.map((item) => item.module_type),
    modules.map((item) => item.moduleType),
  );
  assert.equal(storefront.modules[3].config.visible, false);
  assert.deepEqual(
    storefront.modules
      .filter((item) => item.config.visible !== false)
      .map((item) => item.module_type),
    ['store_hero', 'content_feed', 'quick_actions', 'service_catalog', 'store_info'],
  );
});
