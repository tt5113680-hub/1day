import { expect, test } from '@playwright/test';
const api = 'http://127.0.0.1:3098';
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
test('manager compares store signals at desktop width', async ({ page }) => {
  await page.addInitScript((value) => sessionStorage.setItem('oneday.accessToken', value), token);
  await page.goto('/m/stores');
  await expect(
    page.getByRole('heading', { name: '在同一视图比较每个门店的入口与经营信号' }),
  ).toBeVisible();
  await expect(page.getByText('近 30 天入口打开').first()).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-M-007/management-stores-desktop.png',
    fullPage: false,
  });
});
test('store management recovers without a session', async ({ page }) => {
  await page.goto('/m/stores');
  await expect(page.getByRole('heading', { name: '无权查看门店管理' })).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-M-007/management-stores-forbidden.png',
    fullPage: true,
  });
});
