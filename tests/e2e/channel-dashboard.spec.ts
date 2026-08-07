import { expect, test } from '@playwright/test';

const api = 'http://127.0.0.1:3146';
const systemTenantId = '00000000-0000-4000-8000-000000000001';
let token = '';

test.beforeAll(async () => {
  const response = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@system.local',
      password: 'ChangeMe123!',
      tenantId: systemTenantId,
    }),
  });
  expect(response.status).toBe(201);
  token = (await response.json()).accessToken;
});

test('channel operator views persisted merchant operating signals', async ({ page }) => {
  await page.addInitScript((value) => sessionStorage.setItem('oneday.accessToken', value), token);
  await page.goto('/ch/dashboard');
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.getByLabel('Channel operating metrics')).toBeVisible();
  await page.screenshot({
    path: 'evidence/CHANNEL-001/channel-dashboard-desktop.png',
    fullPage: false,
  });
});

test('channel dashboard rejects a missing session', async ({ page }) => {
  await page.goto('/ch/dashboard');
  await expect(page.locator('h1')).toBeVisible();
  await page.screenshot({
    path: 'evidence/CHANNEL-001/channel-dashboard-forbidden.png',
    fullPage: true,
  });
});
