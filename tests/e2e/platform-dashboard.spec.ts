import { expect, test } from '@playwright/test';
const api = 'http://127.0.0.1:3121';
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
test('platform admin views global operational signals', async ({ page }) => {
  await page.addInitScript((value) => sessionStorage.setItem('oneday.accessToken', value), token);
  await page.goto('/p/dashboard');
  await expect(page.getByRole('heading', { name: '跨租户经营信号与系统状态' })).toBeVisible();
  await expect(page.getByText('活跃租户', { exact: true })).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-P-001/platform-dashboard-desktop.png',
    fullPage: false,
  });
});
test('platform dashboard rejects missing session', async ({ page }) => {
  await page.goto('/p/dashboard');
  await expect(page.getByRole('heading', { name: '无权查看平台总览' })).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-P-001/platform-dashboard-forbidden.png',
    fullPage: true,
  });
});
