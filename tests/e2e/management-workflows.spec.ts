import { expect, test } from '@playwright/test';
const api = 'http://127.0.0.1:3094',
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
test('manager reviews workflow templates, approval responsibility and instance status', async ({
  page,
}) => {
  await page.addInitScript(
    ([access, refresh]) => {
      sessionStorage.setItem('oneday.accessToken', access);
      sessionStorage.setItem('oneday.refreshToken', refresh);
      sessionStorage.setItem('oneday.accessExpiresAt', String(Date.now() + 15 * 60 * 1000));
    },
    [token, refreshToken],
  );
  await page.goto('/m/workflows');
  await expect(page.getByRole('heading', { name: '让每个流程实例都可定位、可推进' })).toBeVisible();
  await expect(page.getByText('实例与责任人')).toBeVisible();
  await page.getByLabel('实例状态').selectOption('active');
  await expect(page.getByRole('heading', { name: '让每个流程实例都可定位、可推进' })).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-M-005/management-workflows-desktop.png',
    fullPage: false,
  });
});
test('workflow center recovers without a session', async ({ page }) => {
  await page.goto('/m/workflows');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading')).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-M-005/management-workflows-forbidden.png',
    fullPage: true,
  });
});
