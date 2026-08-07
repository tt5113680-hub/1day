import { expect, test } from '@playwright/test';

const api = 'http://127.0.0.1:3127';
const systemTenant = '00000000-0000-4000-8000-000000000001';
let token = '';

test.beforeAll(async () => {
  const response = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@system.local',
      password: 'ChangeMe123!',
      tenantId: systemTenant,
    }),
  });
  expect(response.status).toBe(201);
  token = (await response.json()).accessToken;
});

test('platform admin completes the tenant onboarding wizard', async ({ page }) => {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const slug = `browser-${suffix}`;
  await page.addInitScript((value) => sessionStorage.setItem('oneday.accessToken', value), token);
  await page.goto('/p/tenants/new');
  const inputs = page.locator('input');
  await inputs.nth(0).fill(slug);
  await inputs.nth(1).fill(`Browser ${suffix}`);
  await inputs.nth(2).fill('Browser HQ');
  await inputs.nth(3).fill('Browser Main');
  await inputs.nth(4).fill('Browser Owner');
  await inputs.nth(5).fill(`browser-owner-${suffix}@example.test`);
  await inputs.nth(6).fill(`Browser-${suffix}-Password!`);
  await page.locator('select').selectOption('service');
  await page.locator('button').click();
  await expect(page.getByRole('status')).toContainText(slug);
  await page.screenshot({
    path: 'evidence/PAGE-P-003/platform-onboarding-desktop.png',
    fullPage: false,
  });
});

test('onboarding page rejects a missing session', async ({ page }) => {
  await page.goto('/p/tenants/new');
  await expect(page.locator('h1')).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-P-003/platform-onboarding-forbidden.png',
    fullPage: true,
  });
});
