import { expect, test } from '@playwright/test';
const api = 'http://127.0.0.1:3103',
  tenant = '00000000-0000-4000-8000-000000000001';
let token = '';
let refreshToken = '';
test.beforeAll(async () => {
  const r = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@system.local',
      password: 'ChangeMe123!',
      tenantId: tenant,
    }),
  });
  expect(r.status).toBe(201);
  ({ accessToken: token, refreshToken } = await r.json());
});
test('manager previews role permission impact at desktop width', async ({ page }) => {
  await page.addInitScript(
    ([access, refresh]) => {
      sessionStorage.setItem('oneday.accessToken', access);
      sessionStorage.setItem('oneday.refreshToken', refresh);
      sessionStorage.setItem('oneday.accessExpiresAt', String(Date.now() + 15 * 60 * 1000));
    },
    [token, refreshToken],
  );
  await page.goto('/m/roles-permissions');
  await expect(page.getByRole('heading', { name: '在变更前看清权限范围与成员影响' })).toBeVisible();
  await page.getByRole('button', { name: '查看与变更' }).first().click();
  await expect(page.getByRole('heading', { name: /^变更 / })).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-M-009/management-roles-permissions-desktop-v3.png',
    fullPage: false,
  });
});
test('role permission management recovers without a session', async ({ page }) => {
  await page.goto('/m/roles-permissions');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading')).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-M-009/management-roles-permissions-forbidden.png',
    fullPage: true,
  });
});
