import { expect, test, type Page } from '@playwright/test';

const api = 'http://127.0.0.1:3251';
const consumerBase = 'http://localhost:3252';
const managementBase = 'http://localhost:3253';
const employeeBase = 'http://localhost:3254';
const system = '00000000-0000-4000-8000-000000000001';

let slug = '';
let storeId = '';
let tenantId = '';
let ownerAccess = '';
let ownerRefresh = '';
let email = '';
let password = '';
let memberCode = '';
let benefitId = '';
let channelId = '';
let circleId = '';

const h = (token: string, tenant: string, more: Record<string, string> = {}) => ({
  authorization: `Bearer ${token}`,
  'x-tenant-context': tenant,
  'x-request-id': crypto.randomUUID(),
  'content-type': 'application/json',
  ...more,
});

async function session(page: Page, access: string, refresh: string) {
  await page.addInitScript(
    ([a, r]: string[]) => {
      sessionStorage.setItem('oneday.accessToken', a);
      sessionStorage.setItem('oneday.refreshToken', r);
      sessionStorage.setItem('oneday.accessExpiresAt', String(Date.now() + 900000));
    },
    [access, refresh],
  );
}

test.beforeAll(async () => {
  const login = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@system.local',
      password: 'ChangeMe123!',
      tenantId: system,
    }),
  });
  expect(login.status).toBe(201);
  const systemToken = (await login.json()).accessToken as string;
  const stamp = `ui-${Date.now()}`;
  slug = `b4-${stamp}`;
  email = `${slug}@example.test`;
  password = `Batch4-${stamp}-Password!`;
  const provision = await fetch(`${api}/api/v1/platform/onboarding`, {
    method: 'POST',
    headers: h(systemToken, system, { 'idempotency-key': crypto.randomUUID() }),
    body: JSON.stringify({
      slug,
      tenantName: `Batch4 UI ${stamp}`,
      organizationName: 'Batch4 UI HQ',
      merchantName: 'Batch4 UI Merchant',
      storeName: 'Batch4 UI Store',
      address: '99 Batch UI Road',
      phone: '021-55554111',
      businessHours: '09:00-21:00',
      adminName: 'Batch4 UI Owner',
      adminEmail: email,
      adminPassword: password,
      industry: 'restaurant',
      plan: 'starter',
    }),
  });
  expect(provision.status).toBe(201);
  const run = (await provision.json()).data;
  expect(run.state).toBe('ready');
  tenantId = run.tenantId;
  storeId = run.steps.find((step: { code: string }) => step.code === 'organization_store').output
    .storeId;

  const ownerLogin = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, tenantId }),
  });
  expect(ownerLogin.status).toBe(201);
  ({ accessToken: ownerAccess, refreshToken: ownerRefresh } = await ownerLogin.json());

  const memberships = await fetch(`${api}/api/v1/management/memberships`, {
    headers: h(ownerAccess, tenantId),
  });
  benefitId = (await memberships.json()).data.benefits[0].id;

  const channel = await fetch(`${api}/api/v1/platform/channels`, {
    method: 'POST',
    headers: h(systemToken, system, { 'idempotency-key': crypto.randomUUID() }),
    body: JSON.stringify({
      code: `b4-ui-ch-${stamp}`,
      name: `Batch4 UI Channel ${stamp}`,
      merchantTenantId: tenantId,
      onboardingStatus: 'active',
      serviceStatus: 'ready',
    }),
  });
  expect(channel.status).toBe(201);
  channelId = (await channel.json()).data.id;

  const circle = await fetch(`${api}/api/v1/platform/business-circles`, {
    method: 'POST',
    headers: h(systemToken, system, { 'idempotency-key': crypto.randomUUID() }),
    body: JSON.stringify({
      code: `b4-ui-ci-${stamp}`,
      name: `Batch4 UI Circle ${stamp}`,
      description: 'clean tenant circle ui',
      merchantTenantId: tenantId,
      benefits: ['Discovery'],
      recommendationReason: 'Batch 4 UI rehearsal',
    }),
  });
  expect(circle.status).toBe(201);
  const circlePayload = (await circle.json()).data;
  circleId = circlePayload.id;
  const approved = await fetch(
    `${api}/api/v1/platform/business-circles/${circleId}/merchants/${tenantId}/approve`,
    {
      method: 'POST',
      headers: h(systemToken, system, { 'idempotency-key': crypto.randomUUID() }),
      body: JSON.stringify({ version: 1 }),
    },
  );
  expect(approved.status).toBe(201);
});

test('clean-tenant Storefront, membership, management and discovery are browser-visible', async ({
  browser,
}) => {
  const consumer = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const consumerPage = await consumer.newPage();
  await consumerPage.goto(`${consumerBase}/c/entry?tenant=${slug}`);
  await expect(consumerPage.locator('main#top')).toBeVisible({ timeout: 30000 });
  await expect(consumerPage.getByRole('heading', { level: 1 })).toBeVisible();
  await consumerPage.screenshot({
    path: 'evidence/BATCH-4/consumer-storefront.png',
    fullPage: true,
  });

  await consumerPage.goto(`${consumerBase}/c/stores/${storeId}/membership?tenant=${slug}`);
  await expect(consumerPage.getByLabel('入会手机号')).toBeVisible({ timeout: 30000 });
  await consumerPage.getByLabel('入会手机号').fill('13800138041');
  await consumerPage.getByLabel('同意会员隐私授权').check();
  await consumerPage.getByRole('button', { name: '确认加入会员' }).click();
  const status = consumerPage.getByRole('status');
  await expect(status).toContainText('入会成功');
  memberCode = ((await status.textContent()) ?? '').match(/[A-F0-9]{12}/)?.[0] ?? '';
  expect(memberCode).toBeTruthy();
  await consumerPage.screenshot({
    path: 'evidence/BATCH-4/consumer-enrollment.png',
    fullPage: true,
  });

  const list = await fetch(`${api}/api/v1/management/memberships`, {
    headers: h(ownerAccess, tenantId),
  });
  const enrollment = (await list.json()).data.enrollments[0];
  const grant = await fetch(`${api}/api/v1/management/memberships/${enrollment.id}/grants`, {
    method: 'POST',
    headers: h(ownerAccess, tenantId, { 'idempotency-key': crypto.randomUUID() }),
    body: JSON.stringify({ benefitId, quantity: 1 }),
  });
  expect(grant.status).toBe(201);

  const employee = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const employeePage = await employee.newPage();
  await session(employeePage, ownerAccess, ownerRefresh);
  await employeePage.goto(`${employeeBase}/e/workbench`);
  await expect(employeePage.getByLabel('会员码')).toBeVisible({ timeout: 30000 });
  await employeePage.getByLabel('会员码').fill(memberCode);
  await employeePage.getByLabel('核销权益').selectOption(benefitId);
  await employeePage.getByRole('button', { name: '确认核销' }).click();
  await expect(employeePage.getByRole('status')).toContainText('会员权益已核销');
  await employeePage.screenshot({
    path: 'evidence/BATCH-4/employee-redemption.png',
    fullPage: true,
  });

  const management = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const managementPage = await management.newPage();
  await session(managementPage, ownerAccess, ownerRefresh);
  await managementPage.goto(`${managementBase}/m/dashboard`);
  await expect(managementPage.locator('main.od-route-state')).toHaveCount(0, { timeout: 30000 });
  await expect(managementPage.locator('main').first()).toBeVisible();
  await managementPage.screenshot({
    path: 'evidence/BATCH-4/management-outcome.png',
    fullPage: true,
  });

  await consumerPage.goto(`${consumerBase}/c/discovery?tenant=${slug}`);
  await expect
    .poll(async () => {
      const discovery = await fetch(`${api}/api/v1/consumer/discovery?tenant=${slug}`);
      const body = (await discovery.json()).data as {
        channels: Array<{ id: string }>;
        circles: Array<{ id: string }>;
      };
      return (
        body.channels.some((item) => item.id === channelId) &&
        body.circles.some((item) => item.id === circleId)
      );
    })
    .toBeTruthy();
  await expect(consumerPage.locator('main').first()).toBeVisible({ timeout: 30000 });
  await consumerPage.screenshot({
    path: 'evidence/BATCH-4/consumer-discovery.png',
    fullPage: true,
  });
});
