/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const base = 'http://127.0.0.1:3351';
const systemTenant = '00000000-0000-4000-8000-000000000001';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3351',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'matrix-isolation-contracts',
  },
  stdio: 'ignore',
});
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Representative tenant-scoped route inventory for XT-01 contract. */
const ROUTE_INVENTORY = [
  { family: 'management-dashboard', method: 'GET', path: '/api/v1/management/dashboard' },
  { family: 'employee-workbench', method: 'GET', path: '/api/v1/employee/workbench' },
  { family: 'management-stores', method: 'GET', path: '/api/v1/management/stores' },
  { family: 'stores', method: 'GET', path: '/api/v1/stores' },
  { family: 'customers', method: 'GET', path: '/api/v1/customers' },
  { family: 'sync-changes', method: 'GET', path: '/api/v1/sync/changes' },
  {
    family: 'consumer-store-public',
    method: 'GET',
    pathTemplate: '/api/v1/consumer/stores/:id',
    public: true,
  },
];

async function ready() {
  for (let i = 0; i < 50; i += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      // API starting
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

function headers(token, tenantId, extra = {}) {
  return {
    authorization: `Bearer ${token}`,
    'x-tenant-context': tenantId,
    'x-request-id': randomUUID(),
    'content-type': 'application/json',
    ...extra,
  };
}

function assertForbidden(status) {
  assert.ok(status === 403 || status === 401, `expected 403/401, got ${status}`);
}

function assertDeniedWithoutForeignData(status, bodyText, foreignMarkers) {
  assert.notEqual(status, 200, 'must not return foreign tenant payload as 200 success with data');
  assert.ok(
    status === 404 || status === 403 || status === 401,
    `expected denial status, got ${status}`,
  );
  for (const marker of foreignMarkers) {
    assert.equal(bodyText.includes(marker), false, `response leaked foreign marker ${marker}`);
  }
}

async function provisionTenant(systemToken, label) {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const slug = `${label}-${suffix}`;
  const email = `${slug}@example.test`;
  const password = `Iso-${suffix}-Password!`;
  const provision = await fetch(`${base}/api/v1/platform/onboarding`, {
    method: 'POST',
    headers: headers(systemToken, systemTenant, { 'idempotency-key': randomUUID() }),
    body: JSON.stringify({
      slug,
      tenantName: `Iso ${label} ${suffix}`,
      organizationName: `${label} HQ`,
      merchantName: `${label} Merchant`,
      storeName: `${label} Main`,
      address: '1 Isolation Road',
      phone: '021-55550111',
      businessHours: '09:00-21:00',
      adminName: `${label} Owner`,
      adminEmail: email,
      adminPassword: password,
      industry: 'restaurant',
      plan: 'starter',
    }),
  });
  assert.equal(provision.status, 201);
  const run = (await provision.json()).data;
  assert.equal(run.state, 'ready');
  const orgStep = run.steps.find((step) => step.code === 'organization_store');
  assert.ok(orgStep?.output?.storeId);
  const token = await login(email, password, run.tenantId);
  return {
    slug,
    email,
    password,
    token,
    tenantId: run.tenantId,
    storeId: orgStep.output.storeId,
    organizationId: orgStep.output.organizationId,
    merchantId: orgStep.output.merchantId,
    run,
  };
}

test.after(() => api.kill());

test('XT-01 route inventory: cross-tenant context and foreign resource IDs are denied', async () => {
  await ready();
  assert.ok(ROUTE_INVENTORY.length >= 6);
  const system = await login('admin@system.local', 'ChangeMe123!', systemTenant);
  const tenantA = await provisionTenant(system, 'xta');
  const tenantB = await provisionTenant(system, 'xtb');

  const customerB = await fetch(`${base}/api/v1/customers`, {
    method: 'POST',
    headers: headers(tenantB.token, tenantB.tenantId, { 'idempotency-key': randomUUID() }),
    body: JSON.stringify({
      displayName: 'Tenant B Customer',
      identities: [{ type: 'phone', value: `138${String(Date.now()).slice(-8)}` }],
    }),
  });
  assert.equal(customerB.status, 201);
  const customerBId = (await customerB.json()).data.id;

  for (const route of ROUTE_INVENTORY.filter((item) => !item.public)) {
    const cross = await fetch(`${base}${route.path}`, {
      method: route.method,
      headers: headers(tenantA.token, tenantB.tenantId),
    });
    assertForbidden(cross.status);
  }

  const foreignCustomer = await fetch(`${base}/api/v1/customers/${customerBId}`, {
    headers: headers(tenantA.token, tenantA.tenantId),
  });
  const foreignCustomerBody = await foreignCustomer.text();
  assertDeniedWithoutForeignData(foreignCustomer.status, foreignCustomerBody, [
    customerBId,
    tenantB.tenantId,
    'Tenant B Customer',
  ]);

  const customersList = await fetch(`${base}/api/v1/customers`, {
    headers: headers(tenantA.token, tenantA.tenantId),
  });
  assert.equal(customersList.status, 200);
  const customersPayload = await customersList.json();
  const listedIds = (customersPayload.data ?? []).map((row) => row.id);
  assert.equal(listedIds.includes(customerBId), false);

  const storesList = await fetch(`${base}/api/v1/management/stores`, {
    headers: headers(tenantA.token, tenantA.tenantId),
  });
  assert.equal(storesList.status, 200);
  const storeIds = (await storesList.json()).data.map((row) => row.id);
  assert.equal(storeIds.includes(tenantB.storeId), false);
  assert.ok(storeIds.includes(tenantA.storeId));

  const publicCross = await fetch(
    `${base}/api/v1/consumer/stores/${tenantB.storeId}?tenant=${tenantA.slug}`,
  );
  const publicCrossBody = await publicCross.text();
  assert.equal(publicCross.status, 404);
  assert.equal(publicCrossBody.includes(tenantB.storeId), false);
});

test('MS-01 two-store isolation: service on store1 is not visible on store2', async () => {
  await ready();
  const system = await login('admin@system.local', 'ChangeMe123!', systemTenant);
  const tenant = await provisionTenant(system, 'msa');
  const store1 = tenant.storeId;

  const createStore = await fetch(`${base}/api/v1/stores`, {
    method: 'POST',
    headers: headers(tenant.token, tenant.tenantId, { 'idempotency-key': randomUUID() }),
    body: JSON.stringify({
      code: `branch-${Date.now()}`,
      name: 'Isolation Branch',
      organizationId: tenant.organizationId,
      merchantId: tenant.merchantId,
      address: '2 Isolation Branch Road',
    }),
  });
  assert.equal(createStore.status, 201);
  const store2 = (await createStore.json()).data;
  assert.ok(store2.id);
  assert.notEqual(store2.id, store1);

  const listed = await fetch(`${base}/api/v1/management/stores`, {
    headers: headers(tenant.token, tenant.tenantId),
  });
  assert.equal(listed.status, 200);
  const listedIds = (await listed.json()).data.map((row) => row.id);
  assert.ok(listedIds.includes(store1));
  assert.ok(listedIds.includes(store2.id));

  const orgStores = await fetch(`${base}/api/v1/stores`, {
    headers: headers(tenant.token, tenant.tenantId),
  });
  assert.equal(orgStores.status, 200);
  const orgStoreIds = (await orgStores.json()).data.map((row) => row.id);
  assert.ok(orgStoreIds.includes(store1));
  assert.ok(orgStoreIds.includes(store2.id));

  const serviceName = `Store1-Only-${Date.now()}`;
  const createService = await fetch(`${base}/api/v1/management/catalog/stores/${store1}/services`, {
    method: 'POST',
    headers: headers(tenant.token, tenant.tenantId, { 'idempotency-key': randomUUID() }),
    body: JSON.stringify({
      code: `svc-${Date.now()}`,
      name: serviceName,
      description: 'Visible only on store1',
      priceLabel: '询价',
      rank: 50,
    }),
  });
  assert.equal(createService.status, 201);
  const service = (await createService.json()).data;

  const catalog = await fetch(`${base}/api/v1/management/catalog`, {
    headers: headers(tenant.token, tenant.tenantId),
  });
  assert.equal(catalog.status, 200);
  const catalogStores = (await catalog.json()).data;
  const catalogStore1 = catalogStores.find((row) => row.id === store1);
  const catalogStore2 = catalogStores.find((row) => row.id === store2.id);
  assert.ok(catalogStore1);
  assert.ok(catalogStore2);
  assert.ok(catalogStore1.services.some((row) => row.id === service.id));
  assert.equal(
    catalogStore2.services.some((row) => row.id === service.id),
    false,
  );

  const consumer1 = await fetch(`${base}/api/v1/consumer/stores/${store1}?tenant=${tenant.slug}`);
  assert.equal(consumer1.status, 200);
  const consumer1Data = (await consumer1.json()).data;
  assert.ok(
    consumer1Data.services.some((row) => row.id === service.id || row.name === serviceName),
  );

  const consumer2 = await fetch(
    `${base}/api/v1/consumer/stores/${store2.id}?tenant=${tenant.slug}`,
  );
  assert.equal(consumer2.status, 200);
  const consumer2Data = (await consumer2.json()).data;
  assert.equal(
    consumer2Data.services.some((row) => row.id === service.id || row.name === serviceName),
    false,
  );
  assert.equal(consumer2Data.store.id, store2.id);
  assert.notEqual(consumer2Data.store.id, store1);
});

test('XL-01 external link security: reject javascript/http; allow https', async () => {
  await ready();
  const system = await login('admin@system.local', 'ChangeMe123!', systemTenant);
  const tenant = await provisionTenant(system, 'xla');
  const storeId = tenant.storeId;
  const linkUrl = `${base}/api/v1/management/stores/${storeId}/external-links`;

  for (const targetUrl of ['javascript:alert(1)', 'http://example.test/insecure']) {
    const unsafe = await fetch(linkUrl, {
      method: 'POST',
      headers: headers(tenant.token, tenant.tenantId),
      body: JSON.stringify({
        title: 'Unsafe link',
        targetUrl,
        platformType: 'external',
        enabled: true,
        sortOrder: 0,
      }),
    });
    assert.equal(unsafe.status, 400, `expected 400 for ${targetUrl}`);
  }

  const safe = await fetch(linkUrl, {
    method: 'POST',
    headers: headers(tenant.token, tenant.tenantId),
    body: JSON.stringify({
      title: 'Safe HTTPS link',
      description: 'Allowed external entry',
      targetUrl: 'https://example.test/safe-offer',
      platformType: 'external',
      enabled: true,
      sortOrder: 1,
    }),
  });
  assert.equal(safe.status, 201);
  assert.equal((await safe.json()).data.targetUrl, 'https://example.test/safe-offer');
});

test('XT-02 light: invalid preview and tenant/storeId swap do not leak', async () => {
  await ready();
  const system = await login('admin@system.local', 'ChangeMe123!', systemTenant);
  const tenantA = await provisionTenant(system, 'xt2a');
  const tenantB = await provisionTenant(system, 'xt2b');

  const invalidPreview = await fetch(
    `${base}/api/v1/consumer/stores/${tenantA.storeId}?tenant=${tenantA.slug}&preview=not-a-real-preview-token-zzzzzz`,
  );
  assert.equal(invalidPreview.status, 404);

  const swapped = await fetch(
    `${base}/api/v1/consumer/stores/${tenantB.storeId}?tenant=${tenantA.slug}`,
  );
  const swappedBody = await swapped.text();
  assert.equal(swapped.status, 404);
  assert.equal(swappedBody.includes(tenantB.slug), false);
  assert.equal(swappedBody.includes(tenantB.tenantId), false);

  const swappedPreview = await fetch(
    `${base}/api/v1/consumer/stores/${tenantB.storeId}?tenant=${tenantA.slug}&preview=aaaaaaaaaaaaaaaaaaaaaaaaaaaa`,
  );
  assert.equal(swappedPreview.status, 404);
});
