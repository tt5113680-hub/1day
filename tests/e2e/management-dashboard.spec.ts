import { expect, test } from '@playwright/test';

const api = 'http://127.0.0.1:3082';
const tenant = '00000000-0000-4000-8000-000000000001';
let token = '';

test.beforeAll(async () => {
  const response = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@system.local',
      password: 'ChangeMe123!',
      tenantId: tenant,
    }),
  });

  expect(response.status).toBe(201);
  token = (await response.json()).accessToken;
});

test('manager sees real dashboard signals at desktop width', async ({ page }) => {
  await page.addInitScript((value) => sessionStorage.setItem('oneday.accessToken', value), token);
  await page.goto('/m/dashboard');

  await expect(page.locator('h1')).toHaveText('工作台');
  await expect(page.locator('main')).toContainText('常用功能');
  await expect(page.locator('main')).toContainText('客户');
  await page.screenshot({
    path: 'evidence/PAGE-M-001/management-dashboard-desktop.png',
    fullPage: false,
  });
});

test('dashboard recovers without a session', async ({ page }) => {
  await page.goto('/m/dashboard');

  await expect(page.locator('h1')).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-M-001/management-dashboard-forbidden.png',
    fullPage: true,
  });
});
