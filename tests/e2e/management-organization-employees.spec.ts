import { expect, test } from '@playwright/test';
const api = 'http://127.0.0.1:3100';
const tenant = '00000000-0000-4000-8000-000000000001';
let token = '';
let refreshToken = '';
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
  ({ accessToken: token, refreshToken } = await response.json());
});
test('manager reviews organization and handoff risk at desktop width', async ({ page }) => {
  await page.addInitScript(
    ([access, refresh]) => {
      sessionStorage.setItem('oneday.accessToken', access);
      sessionStorage.setItem('oneday.refreshToken', refresh);
      sessionStorage.setItem('oneday.accessExpiresAt', String(Date.now() + 15 * 60 * 1000));
    },
    [token, refreshToken],
  );
  await page.goto('/m/organization-employees');
  await expect(
    page.getByRole('heading', { name: '让每位员工的归属、待办与离职交接可见' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: '员工与交接风险' })).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-M-008/management-organization-employees-desktop-v2.png',
    fullPage: false,
  });
  await page.getByRole('heading', { name: '员工与交接风险' }).scrollIntoViewIfNeeded();
  await page.screenshot({
    path: 'evidence/PAGE-M-008/management-organization-employees-handoff.png',
    fullPage: false,
  });
});
test('organization employee management recovers without a session', async ({ page }) => {
  await page.goto('/m/organization-employees');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading')).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-M-008/management-organization-employees-forbidden.png',
    fullPage: true,
  });
});
