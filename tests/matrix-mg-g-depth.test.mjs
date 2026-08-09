/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath, URL } from 'node:url';
import { createRecoverySnapshot } from '../packages/database/dist/index.js';

const { Client, Pool } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const base = 'http://127.0.0.1:3371';
const systemTenant = '00000000-0000-4000-8000-000000000001';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const evidenceDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'evidence',
  'MATRIX-GAP-WAVE-4',
);

const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3371',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'matrix-mg-g-depth',
  },
  stdio: 'ignore',
});

async function ready() {
  for (let i = 0; i < 50; i += 1) {
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
  return response.json();
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

async function provision(systemToken, label, industry = 'restaurant') {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const slug = `mgg-${label}-${suffix}`;
  const email = `${slug}@example.test`;
  const password = `Mgg-${suffix}-Password!`;
  const response = await fetch(`${base}/api/v1/platform/onboarding`, {
    method: 'POST',
    headers: headers(systemToken, systemTenant, { 'idempotency-key': randomUUID() }),
    body: JSON.stringify({
      slug,
      tenantName: `MGG ${label} ${suffix}`,
      organizationName: `${label} HQ`,
      merchantName: `${label} Merchant`,
      storeName: `${label} Store`,
      address: '1 MGG Road',
      phone: '021-55553371',
      businessHours: '09:00-21:00',
      adminName: `${label} Owner`,
      adminEmail: email,
      adminPassword: password,
      industry,
      plan: 'starter',
    }),
  });
  assert.equal(response.status, 201);
  const run = (await response.json()).data;
  assert.equal(run.state, 'ready');
  const storeId = run.steps.find((step) => step.code === 'organization_store').output.storeId;
  const owner = await login(email, password, run.tenantId);
  return { slug, email, password, run, storeId, owner };
}

test.after(() => api.kill());

test('M-02 management CRUD package projects to Consumer with audit/outbox evidence', async () => {
  await ready();
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const system = await login('admin@system.local', 'ChangeMe123!', systemTenant);
    const { slug, run, storeId, owner } = await provision(system.accessToken, 'm02', 'beauty');
    const title = `M02 article ${Date.now()}`;
    const serviceName = `M02 service ${Date.now()}`;

    const link = await fetch(`${base}/api/v1/management/stores/${storeId}/external-links`, {
      method: 'POST',
      headers: headers(owner.accessToken, run.tenantId, { 'idempotency-key': randomUUID() }),
      body: JSON.stringify({
        title: '平台入口',
        description: 'HTTPS external truth',
        targetUrl: 'https://example.test/mgg-offer',
        platformType: 'meituan',
        enabled: true,
        sortOrder: 1,
      }),
    });
    assert.equal(link.status, 201);

    const serviceRes = await fetch(`${base}/api/v1/management/catalog/stores/${storeId}/services`, {
      method: 'POST',
      headers: headers(owner.accessToken, run.tenantId, { 'idempotency-key': randomUUID() }),
      body: JSON.stringify({
        code: `m02-${Date.now()}`,
        name: serviceName,
        description: 'Management truth source service',
        priceLabel: '门店价请咨询',
        rank: 100,
      }),
    });
    assert.equal(serviceRes.status, 201);
    const service = (await serviceRes.json()).data;

    const catalog = await fetch(`${base}/api/v1/management/catalog`, {
      headers: headers(owner.accessToken, run.tenantId),
    });
    assert.equal(catalog.status, 200);
    const store = (await catalog.json()).data.find((item) => item.id === storeId);
    const externalActionId = store.externalLinks.find((item) => item.name === '平台入口').actionId;
    const offerRes = await fetch(
      `${base}/api/v1/management/catalog/services/${service.id}/offers`,
      {
        method: 'POST',
        headers: headers(owner.accessToken, run.tenantId, { 'idempotency-key': randomUUID() }),
        body: JSON.stringify({
          externalActionId,
          offerPrice: 88,
          marketPrice: 128,
          priceSource: '商户经营后台登记',
          sourceUpdatedAt: new Date().toISOString(),
          sortOrder: 1,
        }),
      },
    );
    assert.equal(offerRes.status, 201);
    const offer = (await offerRes.json()).data;

    const contentRes = await fetch(`${base}/api/v1/management/content`, {
      method: 'POST',
      headers: headers(owner.accessToken, run.tenantId, { 'idempotency-key': randomUUID() }),
      body: JSON.stringify({ kind: 'article', title, body: 'M-02 packaged truth' }),
    });
    assert.equal(contentRes.status, 201);
    const content = (await contentRes.json()).data;
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/content/${content.id}/approve`, {
          method: 'POST',
          headers: headers(owner.accessToken, run.tenantId),
          body: JSON.stringify({ version: content.version }),
        })
      ).status,
      201,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/content/${content.id}/placements`, {
          method: 'POST',
          headers: headers(owner.accessToken, run.tenantId),
          body: JSON.stringify({ storeId, rank: 400 }),
        })
      ).status,
      201,
    );

    const enroll = await fetch(`${base}/api/v1/consumer/memberships/enroll?tenant=${slug}`, {
      method: 'POST',
      headers: { 'idempotency-key': randomUUID(), 'content-type': 'application/json' },
      body: JSON.stringify({ storeId, phone: '13900133711', consent: true }),
    });
    assert.equal(enroll.status, 201);
    const member = (await enroll.json()).data;
    const benefits = await fetch(`${base}/api/v1/management/memberships`, {
      headers: headers(owner.accessToken, run.tenantId),
    });
    assert.equal(benefits.status, 200);
    const benefit = (await benefits.json()).data.benefits[0];
    assert.ok(benefit?.id);
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/memberships/${member.enrollmentId}/grants`, {
          method: 'POST',
          headers: headers(owner.accessToken, run.tenantId, { 'idempotency-key': randomUUID() }),
          body: JSON.stringify({ benefitId: benefit.id, quantity: 1 }),
        })
      ).status,
      201,
    );

    const consumer = await fetch(`${base}/api/v1/consumer/stores/${storeId}?tenant=${slug}`);
    assert.equal(consumer.status, 200);
    const publicData = (await consumer.json()).data;
    assert.ok(publicData.services.some((row) => row.id === service.id || row.name === serviceName));
    assert.ok(publicData.platformOffers.some((row) => row.offerId === offer.id));
    assert.ok(publicData.content.some((row) => row.title === title));
    const wallet = await fetch(
      `${base}/api/v1/consumer/memberships/wallet?tenant=${slug}&accessId=${member.profileAccessId}&access=${member.profileAccess}`,
    );
    assert.equal(wallet.status, 200);
    assert.ok((await wallet.json()).data.benefits.some((row) => row.balance >= 1));

    const audits = await client.query(
      `select count(*)::int as n from audit_logs
       where tenant_id=$1 and (
         action like 'content.%' or action like 'membership.%' or action like 'store.%' or action like 'catalog.%'
       )`,
      [run.tenantId],
    );
    if (audits.rows[0].n < 3) {
      const sample = await client.query(
        'select distinct action from audit_logs where tenant_id=$1 order by 1',
        [run.tenantId],
      );
      assert.fail(
        `expected audit rows, got ${audits.rows[0].n}; actions=${sample.rows
          .map((row) => row.action)
          .join(',')}`,
      );
    }
    const outbox = await client.query(
      'select count(*)::int as n from outbox_events where tenant_id=$1',
      [run.tenantId],
    );
    assert.ok(outbox.rows[0].n >= 3, `expected outbox rows, got ${outbox.rows[0].n}`);
  } finally {
    await client.end();
  }
});

test('XT-02 depth: shareCode, sync topic and storefront ETag stay tenant-scoped', async () => {
  await ready();
  const system = await login('admin@system.local', 'ChangeMe123!', systemTenant);
  const tenantA = await provision(system.accessToken, 'xta');
  const tenantB = await provision(system.accessToken, 'xtb');

  const share = await fetch(`${base}/api/v1/employee/share-codes`, {
    method: 'POST',
    headers: headers(tenantA.owner.accessToken, tenantA.run.tenantId, {
      'idempotency-key': randomUUID(),
    }),
    body: JSON.stringify({
      scenario: 'campaign',
      targetPath: `/c/entry?tenant=${tenantA.slug}`,
    }),
  });
  const shareBody = await share.json();
  assert.equal(share.status, 201, JSON.stringify(shareBody));
  const shareCode = shareBody.data.code;
  assert.ok(shareCode);
  assert.equal(
    (await fetch(`${base}/api/v1/public/share-codes/${shareCode}/open`, { method: 'POST' })).status,
    201,
  );

  const foreignList = await fetch(`${base}/api/v1/employee/share-codes`, {
    headers: headers(tenantB.owner.accessToken, tenantB.run.tenantId),
  });
  assert.equal(foreignList.status, 200);
  const foreignCodes = (await foreignList.json()).data.map((row) => row.code);
  assert.equal(foreignCodes.includes(shareCode), false);

  const crossSync = await fetch(`${base}/api/v1/sync/changes`, {
    headers: headers(tenantA.owner.accessToken, tenantB.run.tenantId),
  });
  assert.ok(crossSync.status === 401 || crossSync.status === 403);

  const etagA = await fetch(
    `${base}/api/v1/public/sync/storefront?tenant=${tenantA.slug}&storeId=${tenantA.storeId}`,
    { headers: { 'x-request-id': randomUUID() } },
  );
  const etagB = await fetch(
    `${base}/api/v1/public/sync/storefront?tenant=${tenantB.slug}&storeId=${tenantB.storeId}`,
    { headers: { 'x-request-id': randomUUID() } },
  );
  assert.equal(etagA.status, 200);
  assert.equal(etagB.status, 200);
  const tagA = etagA.headers.get('etag');
  const tagB = etagB.headers.get('etag');
  assert.ok(tagA);
  assert.ok(tagB);
  assert.notEqual(tagA, tagB);

  const swap = await fetch(
    `${base}/api/v1/public/sync/storefront?tenant=${tenantA.slug}&storeId=${tenantB.storeId}`,
    { headers: { 'x-request-id': randomUUID() } },
  );
  assert.ok(swap.status === 404 || swap.status === 400);
});

test('RC-01 recovery clone emits rebuild report with commercial object counts', async () => {
  process.env.ONEDAY_ALLOW_TEST_DATABASE = '1';
  const stamp = Date.now();
  const targetDatabase = `oneday_v3_test_rc01_${stamp}`;
  let report;
  try {
    report = await createRecoverySnapshot(databaseUrl, targetDatabase);
    assert.equal(report.sourceDatabase, 'oneday_v3_test');
    assert.equal(report.targetDatabase, targetDatabase);
    for (const table of [
      'tenants',
      'tenant_provisioning_runs',
      'storefront_bindings',
      'member_benefit_ledger',
      'outbox_events',
      'content_items',
      'content_store_placements',
      'membership_enrollments',
      'sync_notifications',
    ]) {
      assert.equal(typeof report.tables[table], 'number', `missing count for ${table}`);
    }
    mkdirSync(evidenceDir, { recursive: true });
    const reportPath = join(evidenceDir, 'recovery-report.json');
    writeFileSync(
      reportPath,
      JSON.stringify(
        {
          recorded_at: new Date().toISOString(),
          result: 'PASS',
          matrix_id: 'RC-01',
          ...report,
        },
        null,
        2,
      ),
    );
  } finally {
    const adminUrl = new URL(databaseUrl);
    adminUrl.pathname = '/postgres';
    const admin = new Pool({ connectionString: adminUrl.toString() });
    try {
      await admin.query(`drop database if exists "${targetDatabase}"`);
    } finally {
      await admin.end();
    }
  }
  assert.ok(report);
});
