import { expect, test } from '@playwright/test';
const api = 'http://127.0.0.1:3107',
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
  ({ accessToken: token, refreshToken } = (await r.json()) as {
    accessToken: string;
    refreshToken: string;
  });
});
test('manager reviews employee process signals at desktop width', async ({ page }) => {
  await page.addInitScript(
    ({ accessToken, refresh }) => {
      sessionStorage.setItem('oneday.accessToken', accessToken);
      sessionStorage.setItem('oneday.refreshToken', refresh);
      sessionStorage.setItem('oneday.accessExpiresAt', String(Date.now() + 30 * 60 * 1000));
    },
    { accessToken: token, refresh: refreshToken },
  );
  await page.goto('/m/employee-process-performance');
  await expect(
    page.getByRole('heading', { name: '用任务、跟进、证据与贡献过程支持辅导' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: '过程视图' })).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-M-011/management-employee-process-performance-desktop.png',
    fullPage: false,
  });
});
test('employee performance redirects to secure sign-in without a session', async ({ page }) => {
  await page.goto('/m/employee-process-performance');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading')).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-M-011/management-employee-process-performance-forbidden.png',
    fullPage: true,
  });
});
