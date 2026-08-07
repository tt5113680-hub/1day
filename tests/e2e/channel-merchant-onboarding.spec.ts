import { expect, test } from '@playwright/test';

const api = 'http://127.0.0.1:3149';
const systemTenantId = '00000000-0000-4000-8000-000000000001';
let token = '';

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
  token = (await login.json()).accessToken;
  const headers = {
    authorization: `Bearer ${token}`,
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
  await page.addInitScript((value) => sessionStorage.setItem('oneday.accessToken', value), token);
  await page.goto('/ch/merchants/new');
  await expect(page.locator('h1')).toBeVisible();
  await page.getByLabel('First-level channel').selectOption({ index: 1 });
  const suffix = Date.now();
  await page.getByLabel('Merchant slug').fill(`browser-merchant-${suffix}`);
  await page.getByLabel('Merchant name').fill(`Browser Merchant ${suffix}`);
  await page.getByLabel('Organization name').fill('Browser HQ');
  await page.getByLabel('First store').fill('Browser Main');
  await page.getByLabel('Administrator name').fill('Browser Owner');
  await page.getByLabel('Invitation email').fill(`browser-owner-${suffix}@example.test`);
  await page.getByLabel('Initial password').fill(`Browser-${suffix}-Password!`);
  await page.getByRole('button', { name: 'Create onboarding' }).click();
  await expect(page.getByRole('status')).toBeVisible();
  await page.getByRole('button', { name: 'Confirm delivery' }).first().click();
  await expect(page.getByRole('status')).toBeVisible();
  await page.screenshot({
    path: 'evidence/CHANNEL-002/channel-merchant-onboarding-desktop.png',
    fullPage: false,
  });
});

test('channel merchant onboarding rejects a missing session', async ({ page }) => {
  await page.goto('/ch/merchants/new');
  await expect(page.locator('h1')).toBeVisible();
  await page.screenshot({
    path: 'evidence/CHANNEL-002/channel-merchant-onboarding-forbidden.png',
    fullPage: true,
  });
});
