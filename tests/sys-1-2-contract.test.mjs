/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

const base = 'http://127.0.0.1:3262';
const systemTenant = '00000000-0000-4000-8000-000000000001';
const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3262',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'sys-1-2-contract',
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

async function provision(systemToken, industry, stamp) {
  const slug = `${industry.slice(0, 3)}-${stamp}`;
  const email = `${slug}@example.test`;
  const password = `Sys-${stamp}-Password!`;
  const response = await fetch(`${base}/api/v1/platform/onboarding`, {
    method: 'POST',
    headers: headers(systemToken, systemTenant, { 'idempotency-key': randomUUID() }),
    body: JSON.stringify({
      slug,
      tenantName: `SYS ${industry} ${stamp}`,
      organizationName: `${industry} HQ`,
      merchantName: `${industry} Merchant`,
      storeName: `${industry} Store`,
      address: '88 SYS Road',
      phone: '021-55558800',
      businessHours: '09:00-21:00',
      adminName: 'SYS Owner',
      adminEmail: email,
      adminPassword: password,
      industry,
      plan: 'starter',
    }),
  });
  const payload = await response.json();
  assert.equal(response.status, 201, JSON.stringify(payload));
  const run = payload.data;
  assert.equal(run.state, 'ready');
  return { slug, email, password, run };
}

test.after(() => api.kill());

test('SYS-1/2: store-scoped outbound, operating_channels shell config, member_wallet module', async () => {
  await ready();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const system = await login('admin@system.local', 'ChangeMe123!', systemTenant);

  const restaurant = await provision(system, 'restaurant', stamp);
  const beauty = await provision(system, 'beauty', `${stamp}b`);

  for (const tenant of [restaurant, beauty]) {
    const owner = await login(tenant.email, tenant.password, tenant.run.tenantId);
    const list = await fetch(`${base}/api/v1/page-templates`, {
      headers: headers(owner, tenant.run.tenantId),
    });
    assert.equal(list.status, 200);
    const template = (await list.json()).data.find((item) => item.binding_id);
    assert.ok(template, `${tenant.slug} missing storefront binding`);

    const consumer = await fetch(
      `${base}/api/v1/consumer/stores/${template.store_id}?tenant=${encodeURIComponent(tenant.slug)}`,
    );
    assert.equal(consumer.status, 200);
    const data = (await consumer.json()).data;
    assert.equal(data.outboundPolicy, 'store_scoped_links_and_offers');
    assert.ok(
      data.actions.every((item) => ['consultation', 'platform_entry'].includes(item.actionType)),
      `${tenant.slug} actions must be consult/platform_entry only`,
    );
    assert.ok(
      data.actions.some((item) => item.actionType === 'consultation'),
      `${tenant.slug} must expose store-scoped consultation`,
    );
    assert.ok(
      data.externalLinks.every((item) => item.actionType !== 'consultation'),
      `${tenant.slug} platform cards must not include consultation`,
    );

    const types = data.storefront.modules.map((item) => item.module_type);
    assert.ok(types.includes('operating_channels'), `${tenant.slug} missing operating_channels`);
    assert.ok(types.includes('member_wallet'), `${tenant.slug} missing member_wallet`);

    const channels = data.storefront.modules.find(
      (item) => item.module_type === 'operating_channels',
    ).config.channels;
    assert.ok(Array.isArray(channels) && channels.length > 0 && channels.length <= 3);
  }

  const beautyOwner = await login(beauty.email, beauty.password, beauty.run.tenantId);
  const beautyList = await fetch(`${base}/api/v1/page-templates`, {
    headers: headers(beautyOwner, beauty.run.tenantId),
  });
  const beautyTemplate = (await beautyList.json()).data.find((item) => item.binding_id);
  const draftCreate = await fetch(`${base}/api/v1/page-templates/${beautyTemplate.id}/drafts`, {
    method: 'POST',
    headers: headers(beautyOwner, beauty.run.tenantId),
    body: JSON.stringify({ sourceVersionId: beautyTemplate.live_version_id }),
  });
  assert.equal(draftCreate.status, 201);
  const draft = (await draftCreate.json()).data;
  const modules = [
    { moduleType: 'store_hero', config: { emphasis: 'trust', visible: true } },
    {
      moduleType: 'operating_channels',
      config: {
        channels: [
          { code: 'services', label: '服务' },
          { code: 'cases', label: '案例' },
          { code: 'membership', label: '会员' },
        ],
        visible: true,
      },
    },
    {
      moduleType: 'quick_actions',
      config: { capabilities: ['consult', 'appointment'], visible: true },
    },
    { moduleType: 'member_wallet', config: { mode: 'balances', visible: true } },
    { moduleType: 'store_info', config: { visible: true } },
  ];
  const update = await fetch(
    `${base}/api/v1/page-templates/${beautyTemplate.id}/drafts/${draft.id}`,
    {
      method: 'PUT',
      headers: headers(beautyOwner, beauty.run.tenantId),
      body: JSON.stringify({ version: draft.version ?? 1, modules }),
    },
  );
  assert.equal(update.status, 200);
  const refreshed = await (
    await fetch(`${base}/api/v1/page-templates`, {
      headers: headers(beautyOwner, beauty.run.tenantId),
    })
  ).json();
  const current = refreshed.data.find((item) => item.id === beautyTemplate.id);
  const publish = await fetch(`${base}/api/v1/page-templates/${beautyTemplate.id}/publish`, {
    method: 'POST',
    headers: headers(beautyOwner, beauty.run.tenantId),
    body: JSON.stringify({
      versionId: draft.id,
      templateVersion: current.version,
      bindingVersion: current.binding_version,
    }),
  });
  assert.equal(publish.status, 201);
  const live = await fetch(
    `${base}/api/v1/consumer/stores/${beautyTemplate.store_id}?tenant=${encodeURIComponent(beauty.slug)}`,
  );
  assert.equal(live.status, 200);
  const liveModules = (await live.json()).data.storefront.modules;
  assert.deepEqual(
    liveModules.map((item) => item.module_type),
    modules.map((item) => item.moduleType),
  );
  assert.deepEqual(
    liveModules
      .find((item) => item.module_type === 'operating_channels')
      .config.channels.map((item) => item.code),
    ['services', 'cases', 'membership'],
  );
  assert.deepEqual(
    liveModules.find((item) => item.module_type === 'quick_actions').config.capabilities,
    ['consult', 'appointment'],
  );
});
