/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

const base = 'http://127.0.0.1:3250';
const systemTenant = '00000000-0000-4000-8000-000000000001';
const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3250',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'batch-4-clean-tenant-rehearsal',
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
      // API is starting.
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
  const body = await response.json();
  assert.equal(response.status, 201, JSON.stringify(body));
  return body.accessToken;
}

async function provision(systemToken, suffix, industry = 'restaurant') {
  const slug = `b4-${suffix}`;
  const email = `${slug}@example.test`;
  const password = `Batch4-${suffix}-Password!`;
  const response = await fetch(`${base}/api/v1/platform/onboarding`, {
    method: 'POST',
    headers: headers(systemToken, systemTenant, { 'idempotency-key': randomUUID() }),
    body: JSON.stringify({
      slug,
      tenantName: `Batch4 ${suffix}`,
      organizationName: 'Batch4 HQ',
      merchantName: 'Batch4 Merchant',
      storeName: 'Batch4 Store',
      address: '88 Batch Road',
      phone: '021-55554000',
      businessHours: '09:00-21:00',
      adminName: 'Batch4 Owner',
      adminEmail: email,
      adminPassword: password,
      industry,
      plan: 'starter',
    }),
  });
  const provisionBody = await response.json();
  assert.equal(response.status, 201, JSON.stringify(provisionBody));
  const run = provisionBody.data;
  return { run, slug, email, password };
}

test.after(() => api.kill());

test('Batch 4 clean-tenant commercial rehearsal covers READY through isolation and recovery', async () => {
  await ready();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const system = await login('admin@system.local', 'ChangeMe123!', systemTenant);

  const tenantA = await provision(system, `a-${stamp}`, 'restaurant');
  assert.equal(tenantA.run.state, 'ready');
  assert.match(tenantA.run.delivery.oneCode, /^[A-Z0-9]{20}$/);
  assert.ok(Object.values(tenantA.run.verification).every(Boolean));
  assert.equal(tenantA.run.steps.find((step) => step.code === 'channel_circle')?.state, 'skipped');
  const storeId = tenantA.run.steps.find((step) => step.code === 'organization_store').output
    .storeId;
  const contentId = tenantA.run.steps.find((step) => step.code === 'commercial_defaults').output
    .contentId;
  assert.ok(storeId);
  assert.ok(contentId);

  const oneCode = await fetch(`${base}${tenantA.run.delivery.resolvePath}`);
  assert.equal(oneCode.status, 200);
  const oneCodeData = (await oneCode.json()).data;
  assert.equal(oneCodeData.tenant.slug, tenantA.slug);
  assert.ok(oneCodeData.targetPath.startsWith('/c/entry?tenant='));

  const entry = await fetch(
    `${base}/api/v1/consumer/entry?tenant=${encodeURIComponent(tenantA.slug)}`,
  );
  assert.equal(entry.status, 200);
  const entryData = (await entry.json()).data;
  assert.ok(entryData.storefront.liveVersionId);
  assert.equal(entryData.storefront.industry.family, 'restaurant');
  const consult = entryData.actions.find((action) => action.code === 'store-consult');
  assert.ok(consult?.id);

  const store = await fetch(`${base}/api/v1/consumer/stores/${storeId}?tenant=${tenantA.slug}`);
  assert.equal(store.status, 200);
  const storeData = (await store.json()).data;
  assert.ok(storeData.content.some((item) => item.title === '欢迎来到本店'));

  const owner = await login(tenantA.email, tenantA.password, tenantA.run.tenantId);
  for (const path of ['/api/v1/management/dashboard', '/api/v1/employee/workbench']) {
    const response = await fetch(`${base}${path}`, {
      headers: headers(owner, tenantA.run.tenantId),
    });
    assert.equal(response.status, 200, path);
  }

  const enrollKey = randomUUID();
  const enroll = () =>
    fetch(`${base}/api/v1/consumer/memberships/enroll?tenant=${tenantA.slug}`, {
      method: 'POST',
      headers: { 'idempotency-key': enrollKey, 'content-type': 'application/json' },
      body: JSON.stringify({ storeId, phone: '13800138040', consent: true }),
    });
  const enrolled = await enroll();
  assert.equal(enrolled.status, 201);
  const member = (await enrolled.json()).data;
  assert.equal((await enroll()).status, 201);

  const memberships = await fetch(`${base}/api/v1/management/memberships`, {
    headers: headers(owner, tenantA.run.tenantId),
  });
  assert.equal(memberships.status, 200);
  const benefit = (await memberships.json()).data.benefits[0];
  assert.ok(benefit?.id);
  const grant = await fetch(`${base}/api/v1/management/memberships/${member.enrollmentId}/grants`, {
    method: 'POST',
    headers: headers(owner, tenantA.run.tenantId, { 'idempotency-key': randomUUID() }),
    body: JSON.stringify({ benefitId: benefit.id, quantity: 2 }),
  });
  assert.equal(grant.status, 201);
  const redeem = await fetch(`${base}/api/v1/employee/memberships/redeem`, {
    method: 'POST',
    headers: headers(owner, tenantA.run.tenantId, { 'idempotency-key': randomUUID() }),
    body: JSON.stringify({ memberCode: member.memberCode, benefitId: benefit.id }),
  });
  assert.equal(redeem.status, 201);
  const wallet = await fetch(
    `${base}/api/v1/consumer/memberships/wallet?tenant=${tenantA.slug}&accessId=${member.profileAccessId}&access=${member.profileAccess}`,
  );
  assert.equal(wallet.status, 200);
  assert.equal((await wallet.json()).data.benefits[0].balance, 1);

  const share = await fetch(`${base}/api/v1/employee/share-codes`, {
    method: 'POST',
    headers: headers(owner, tenantA.run.tenantId, { 'idempotency-key': randomUUID() }),
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
  const confirm = await fetch(
    `${base}/api/v1/consumer/actions/${consult.id}/confirm?tenant=${tenantA.slug}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': randomUUID() },
      body: JSON.stringify({
        source: 'scene:batch_4_clean_tenant',
        returnTo: `/c/entry?tenant=${tenantA.slug}`,
        shareCode,
      }),
    },
  );
  const confirmBody = await confirm.json();
  assert.equal(confirm.status, 201, JSON.stringify(confirmBody));
  const operating = confirmBody.data.operating;
  assert.equal(operating.assignmentBasis, 'employee_share');
  assert.ok(operating.taskId);
  assert.ok(operating.customerId);

  const workbench = await fetch(`${base}/api/v1/employee/workbench`, {
    headers: headers(owner, tenantA.run.tenantId),
  });
  assert.equal(workbench.status, 200);
  const task = (await workbench.json()).data.customerReminders.find(
    (item) => item.id === operating.taskId,
  );
  assert.ok(task, 'assigned task must appear on the owner employee workbench');
  const followUp = await fetch(`${base}/api/v1/employee/tasks/${task.id}/follow-ups`, {
    method: 'POST',
    headers: headers(owner, tenantA.run.tenantId, { 'idempotency-key': randomUUID() }),
    body: JSON.stringify({
      actionType: 'message',
      rawNote: 'Batch 4 clean-tenant follow-up recorded.',
      nextTaskTitle: 'Confirm clean-tenant consultation',
      nextTaskDueAt: '2030-01-01T00:00:00.000Z',
    }),
  });
  assert.equal(followUp.status, 201);
  const completed = await fetch(`${base}/api/v1/employee/workbench/tasks/${task.id}/complete`, {
    method: 'POST',
    headers: headers(owner, tenantA.run.tenantId),
    body: JSON.stringify({ version: task.version }),
  });
  assert.equal(completed.status, 201);
  const managementCustomer = await fetch(
    `${base}/api/v1/management/customers/${operating.customerId}`,
    { headers: headers(owner, tenantA.run.tenantId) },
  );
  assert.equal(managementCustomer.status, 200);
  const managementData = (await managementCustomer.json()).data;
  assert.ok(managementData.tasks.some((item) => item.status === 'completed'));
  assert.ok(managementData.sources.some((item) => item.source_type === 'employee_share'));

  const articleTitle = `Batch4 placement ${stamp}`;
  const createdContent = await fetch(`${base}/api/v1/management/content`, {
    method: 'POST',
    headers: headers(owner, tenantA.run.tenantId, { 'idempotency-key': randomUUID() }),
    body: JSON.stringify({ kind: 'article', title: articleTitle, body: 'clean tenant placement' }),
  });
  assert.equal(createdContent.status, 201);
  const contentItem = (await createdContent.json()).data;
  const approved = await fetch(`${base}/api/v1/management/content/${contentItem.id}/approve`, {
    method: 'POST',
    headers: headers(owner, tenantA.run.tenantId),
    body: JSON.stringify({ version: contentItem.version }),
  });
  assert.equal(approved.status, 201);
  const placed = await fetch(`${base}/api/v1/management/content/${contentItem.id}/placements`, {
    method: 'POST',
    headers: headers(owner, tenantA.run.tenantId),
    body: JSON.stringify({ storeId, rank: 500 }),
  });
  assert.equal(placed.status, 201);
  const placedStore = await fetch(
    `${base}/api/v1/consumer/stores/${storeId}?tenant=${tenantA.slug}`,
  );
  assert.equal(
    (await placedStore.json()).data.content.some((item) => item.title === articleTitle),
    true,
  );

  const channel = await fetch(`${base}/api/v1/platform/channels`, {
    method: 'POST',
    headers: headers(system, systemTenant, { 'idempotency-key': randomUUID() }),
    body: JSON.stringify({
      code: `b4-ch-${stamp}`,
      name: `Batch4 Channel ${stamp}`,
      merchantTenantId: tenantA.run.tenantId,
      onboardingStatus: 'active',
      serviceStatus: 'ready',
    }),
  });
  const channelBody = await channel.json();
  assert.equal(channel.status, 201, JSON.stringify(channelBody));
  const channelId = channelBody.data.id;

  const circleCreate = await fetch(`${base}/api/v1/platform/business-circles`, {
    method: 'POST',
    headers: headers(system, systemTenant, { 'idempotency-key': randomUUID() }),
    body: JSON.stringify({
      code: `b4-ci-${stamp}`,
      name: `Batch4 Circle ${stamp}`,
      description: 'clean tenant circle',
      merchantTenantId: tenantA.run.tenantId,
      benefits: ['Discovery'],
      recommendationReason: 'Batch 4 rehearsal',
    }),
  });
  const circleCreateBody = await circleCreate.json();
  assert.equal(circleCreate.status, 201, JSON.stringify(circleCreateBody));
  const circlePayload = circleCreateBody.data;
  const circleApprove = await fetch(
    `${base}/api/v1/platform/business-circles/${circlePayload.id}/merchants/${tenantA.run.tenantId}/approve`,
    {
      method: 'POST',
      headers: headers(system, systemTenant, { 'idempotency-key': randomUUID() }),
      body: JSON.stringify({ version: 1 }),
    },
  );
  const circleApproveBody = await circleApprove.json();
  assert.equal(circleApprove.status, 201, JSON.stringify(circleApproveBody));

  const discovery = await fetch(
    `${base}/api/v1/consumer/discovery?tenant=${encodeURIComponent(tenantA.slug)}`,
  );
  assert.equal(discovery.status, 200);
  const discoveryData = (await discovery.json()).data;
  const channelHit = discoveryData.channels.find((item) => item.id === channelId);
  const circleHit = discoveryData.circles.find((item) => item.id === circlePayload.id);
  assert.ok(channelHit, 'approved channel membership must project to Consumer discovery');
  assert.ok(
    channelHit.merchants.some(
      (merchant) => merchant.entryUrl === `/c/stores/${storeId}?tenant=${tenantA.slug}`,
    ),
  );
  assert.ok(circleHit, 'approved circle membership must project to Consumer discovery');
  assert.ok(
    circleHit.merchants.some(
      (merchant) => merchant.entryUrl === `/c/stores/${storeId}?tenant=${tenantA.slug}`,
    ),
  );

  const tenantB = await provision(system, `b-${stamp}`, 'beauty');
  const ownerB = await login(tenantB.email, tenantB.password, tenantB.run.tenantId);
  const crossCustomer = await fetch(`${base}/api/v1/management/customers/${operating.customerId}`, {
    headers: headers(ownerB, tenantB.run.tenantId),
  });
  assert.equal(crossCustomer.status, 404);
  const discoveryB = await fetch(
    `${base}/api/v1/consumer/discovery?tenant=${encodeURIComponent(tenantB.slug)}`,
  );
  assert.equal(discoveryB.status, 200);
  const discoveryBData = (await discoveryB.json()).data;
  assert.equal(
    discoveryBData.channels.some((item) => item.id === channelId),
    false,
  );
  assert.equal(
    discoveryBData.circles.some((item) => item.id === circlePayload.id),
    false,
  );

  const tenants = await fetch(`${base}/api/v1/platform/tenants`, {
    headers: headers(system, systemTenant),
  });
  assert.equal(tenants.status, 200);
  const target = (await tenants.json()).data.find((item) => item.id === tenantA.run.tenantId);
  assert.ok(target);
  const suspend = await fetch(`${base}/api/v1/platform/tenants/${tenantA.run.tenantId}`, {
    method: 'PUT',
    headers: headers(system, systemTenant, { 'idempotency-key': randomUUID() }),
    body: JSON.stringify({
      plan: 'starter',
      quotas: { users: 10, customers: 1000, stores: 3 },
      riskLevel: 'low',
      status: 'suspended',
      version: target.version,
      confirmation: `SUSPEND:${tenantA.slug}`,
    }),
  });
  const suspendBody = await suspend.json();
  assert.equal(suspend.status, 200, JSON.stringify(suspendBody));
  const suspended = suspendBody.data;
  assert.equal(suspended.status, 'suspended');
  assert.equal(
    (
      await fetch(`${base}/api/v1/management/dashboard`, {
        headers: headers(owner, tenantA.run.tenantId),
      })
    ).status,
    401,
  );
  assert.equal(
    (await fetch(`${base}/api/v1/consumer/entry?tenant=${encodeURIComponent(tenantA.slug)}`))
      .status,
    404,
  );

  const reactivate = await fetch(`${base}/api/v1/platform/tenants/${tenantA.run.tenantId}`, {
    method: 'PUT',
    headers: headers(system, systemTenant, { 'idempotency-key': randomUUID() }),
    body: JSON.stringify({
      plan: 'starter',
      quotas: { users: 10, customers: 1000, stores: 3 },
      riskLevel: 'low',
      status: 'active',
      version: suspended.version,
      confirmation: `ACTIVATE:${tenantA.slug}`,
    }),
  });
  assert.equal(reactivate.status, 200);
  assert.equal((await reactivate.json()).data.status, 'active');
  assert.equal(
    (await fetch(`${base}/api/v1/consumer/entry?tenant=${encodeURIComponent(tenantA.slug)}`))
      .status,
    200,
  );
  const recoveredOwner = await login(tenantA.email, tenantA.password, tenantA.run.tenantId);
  assert.equal(
    (
      await fetch(`${base}/api/v1/management/dashboard`, {
        headers: headers(recoveredOwner, tenantA.run.tenantId),
      })
    ).status,
    200,
  );
});
