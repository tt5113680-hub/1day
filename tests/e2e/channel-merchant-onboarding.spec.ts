import { expect, test } from '@playwright/test';

const api = 'http://127.0.0.1:3149';
const systemTenantId = '00000000-0000-4000-8000-000000000001';
let session = { accessToken: '', refreshToken: '', expiresAt: '' };

test.beforeAll(async () => {
  const login = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@system.local',
      password: 'ChangeMe123!',
      tenantId: systemTenantId,
    }),
  });
  expect(login.status).toBe(201);
  const loginData = await login.json();
  session = {
    accessToken: loginData.accessToken,
    refreshToken: loginData.refreshToken,
    expiresAt: loginData.expiresAt,
  };
  const headers = {
    authorization: `Bearer ${session.accessToken}`,
    'x-request-id': crypto.randomUUID(),
    'content-type': 'application/json',
  };
  const existing = await fetch(`${api}/api/v1/platform/channels`, { headers });
  const data = (await existing.json()).data;
  if (!data.channels.length) {
    const created = await fetch(`${api}/api/v1/platform/channels`, {
      method: 'POST',
      headers: { ...headers, 'idempotency-key': crypto.randomUUID() },
      body: JSON.stringify({
        code: `browser-channel-${Date.now()}`,
        name: 'Browser Channel',
        merchantTenantId: data.merchantPool[0].tenantId,
        onboardingStatus: 'invited',
        serviceStatus: 'pending',
      }),
    });
    expect(created.status).toBe(201);
  }
});

test('channel operator provisions merchant and confirms delivery', async ({ page }) => {
  await page.addInitScript((value) => {
    sessionStorage.setItem('oneday.accessToken', value.accessToken);
    sessionStorage.setItem('oneday.refreshToken', value.refreshToken);
    sessionStorage.setItem('oneday.accessExpiresAt', value.expiresAt);
  }, session);
  await page.goto('/ch/merchants/new');
  await expect(page.locator('h1')).toBeVisible();
  await page.getByLabel('一级渠道').selectOption({ index: 1 });
  const suffix = Date.now();
  await page.getByLabel('商户标识').fill(`browser-merchant-${suffix}`);
  await page.getByLabel('商户名称').fill(`Browser Merchant ${suffix}`);
  await page.getByLabel('组织名称').fill('Browser HQ');
  await page.getByLabel('首家门店').fill('Browser Main');
  await page.getByLabel('管理员姓名').fill('Browser Owner');
  await page.getByLabel('邀请邮箱').fill(`browser-owner-${suffix}@example.test`);
  await page.getByLabel('初始密码').fill(`Browser-${suffix}-Password!`);
  await page.getByRole('button', { name: '创建开通记录' }).click();
  await expect(page.getByRole('status')).toBeVisible();
  await page.getByRole('button', { name: '确认交付' }).first().click();
  await expect(page.getByRole('status')).toBeVisible();
  await page.screenshot({
    path: 'evidence/CHANNEL-002/channel-merchant-onboarding-desktop-v2.png',
    fullPage: false,
  });
});

test('channel merchant onboarding rejects a missing session', async ({ page }) => {
  await page.goto('/ch/merchants/new');
  await expect(page.locator('h1')).toBeVisible();
  await page.screenshot({
    path: 'evidence/CHANNEL-002/channel-merchant-onboarding-forbidden-v2.png',
    fullPage: true,
  });
});
