/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const base = 'http://127.0.0.1:3226';
const systemTenant = '00000000-0000-4000-8000-000000000001';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3226',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'batch-2-offer-operations',
  },
  stdio: 'ignore',
});
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
async function ready() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      // API is starting.
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
const headers = (token, tenantId, extra = {}) => ({
  authorization: `Bearer ${token}`,
  'x-tenant-context': tenantId,
  'x-request-id': randomUUID(),
  'content-type': 'application/json',
  ...extra,
});
test.after(() => api.kill());

test('merchant operates a service and truthful platform Offer visible to Consumer', async () => {
  await ready();
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const slug = `offers-${suffix}`;
  const ownerEmail = `offers-${suffix}@example.test`;
  const ownerPassword = `Offers-${suffix}-Password!`;
  const systemToken = await login('admin@system.local', 'ChangeMe123!', systemTenant);
  const provision = await fetch(`${base}/api/v1/platform/onboarding`, {
    method: 'POST',
    headers: headers(systemToken, systemTenant, { 'idempotency-key': randomUUID() }),
    body: JSON.stringify({
      slug,
      tenantName: `Offers ${suffix}`,
      organizationName: 'Offers HQ',
      merchantName: 'Offers Merchant',
      storeName: 'Offers Main',
      address: '50 Offers Road',
      phone: '021-55555000',
      businessHours: '09:00-21:00',
      adminName: 'Offers Owner',
      adminEmail: ownerEmail,
      adminPassword: ownerPassword,
      industry: 'restaurant',
      plan: 'starter',
    }),
  });
  assert.equal(provision.status, 201);
  const run = (await provision.json()).data;
  const ownerToken = await login(ownerEmail, ownerPassword, run.tenantId);
  const storeId = run.steps.find((step) => step.code === 'organization_store').output.storeId;

  const unsafeLink = await fetch(`${base}/api/v1/management/stores/${storeId}/external-links`, {
    method: 'POST',
    headers: headers(ownerToken, run.tenantId),
    body: JSON.stringify({
      title: 'Unsafe',
      targetUrl: 'http://example.test/not-secure',
      platformType: 'external',
      enabled: true,
      sortOrder: 0,
    }),
  });
  assert.equal(unsafeLink.status, 400);
  const link = await fetch(`${base}/api/v1/management/stores/${storeId}/external-links`, {
    method: 'POST',
    headers: headers(ownerToken, run.tenantId),
    body: JSON.stringify({
      title: '美团门店套餐',
      description: '前往平台核对最终价格与库存',
      targetUrl: 'https://example.test/merchant-offer',
      platformType: 'meituan',
      enabled: true,
      sortOrder: 1,
    }),
  });
  assert.equal(link.status, 201);

  const serviceKey = randomUUID();
  const createService = () =>
    fetch(`${base}/api/v1/management/catalog/stores/${storeId}/services`, {
      method: 'POST',
      headers: headers(ownerToken, run.tenantId, { 'idempotency-key': serviceKey }),
      body: JSON.stringify({
        code: `meal-${suffix}`,
        name: '双人招牌套餐',
        description: '套餐内容以门店和平台最终确认页面为准。',
        priceLabel: '门店价请咨询',
        rank: 200,
      }),
    });
  const serviceResponse = await createService();
  assert.equal(serviceResponse.status, 201);
  const service = (await serviceResponse.json()).data;
  const replay = await createService();
  assert.equal(replay.status, 201);
  assert.equal((await replay.json()).data.id, service.id);

  const catalog = await fetch(`${base}/api/v1/management/catalog`, {
    headers: headers(ownerToken, run.tenantId),
  });
  assert.equal(catalog.status, 200);
  const store = (await catalog.json()).data.find((item) => item.id === storeId);
  const externalActionId = store.externalLinks.find(
    (item) => item.name === '美团门店套餐',
  ).actionId;
  const invalidOffer = await fetch(
    `${base}/api/v1/management/catalog/services/${service.id}/offers`,
    {
      method: 'POST',
      headers: headers(ownerToken, run.tenantId, { 'idempotency-key': randomUUID() }),
      body: JSON.stringify({
        externalActionId,
        offerPrice: 129,
        marketPrice: 99,
        priceSource: '商户后台登记',
        sourceUpdatedAt: new Date().toISOString(),
      }),
    },
  );
  assert.equal(invalidOffer.status, 400);
  const offerKey = randomUUID();
  const createOffer = () =>
    fetch(`${base}/api/v1/management/catalog/services/${service.id}/offers`, {
      method: 'POST',
      headers: headers(ownerToken, run.tenantId, { 'idempotency-key': offerKey }),
      body: JSON.stringify({
        externalActionId,
        offerPrice: 99,
        marketPrice: 129,
        priceSource: '商户后台登记',
        sourceUpdatedAt: new Date().toISOString(),
        sortOrder: 1,
      }),
    });
  const offerResponse = await createOffer();
  assert.equal(offerResponse.status, 201);
  const offer = (await offerResponse.json()).data;
  const offerReplay = await createOffer();
  assert.equal((await offerReplay.json()).data.id, offer.id);

  const consumer = await fetch(`${base}/api/v1/consumer/stores/${storeId}?tenant=${slug}`);
  assert.equal(consumer.status, 200);
  const publicData = (await consumer.json()).data;
  const publicOffer = publicData.platformOffers.find((item) => item.offerId === offer.id);
  assert.equal(publicOffer.offerPrice, 99);
  assert.equal(publicOffer.marketPrice, 129);
  assert.equal(publicOffer.priceSource, '商户后台登记');
  assert.ok(publicOffer.sourceUpdatedAt);

  const disable = await fetch(`${base}/api/v1/management/catalog/offers/${offer.id}`, {
    method: 'PUT',
    headers: headers(ownerToken, run.tenantId),
    body: JSON.stringify({
      offerPrice: 99,
      marketPrice: 129,
      priceSource: '商户后台登记',
      sourceUpdatedAt: new Date().toISOString(),
      sortOrder: 1,
      status: 'inactive',
      version: offer.version,
    }),
  });
  assert.equal(disable.status, 200);
  const consumerAfterDisable = await fetch(
    `${base}/api/v1/consumer/stores/${storeId}?tenant=${slug}`,
  );
  assert.equal(
    (await consumerAfterDisable.json()).data.platformOffers.some(
      (item) => item.offerId === offer.id,
    ),
    false,
  );
  const crossTenant = await fetch(
    `${base}/api/v1/management/catalog/stores/00000000-0000-4000-8000-000000000101/services`,
    {
      method: 'POST',
      headers: headers(ownerToken, run.tenantId, { 'idempotency-key': randomUUID() }),
      body: JSON.stringify({ code: 'cross-tenant', name: 'Cross tenant' }),
    },
  );
  assert.equal(crossTenant.status, 404);
});
