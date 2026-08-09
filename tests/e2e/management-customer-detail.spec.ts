import { expect, test } from '@playwright/test';

const api = 'http://127.0.0.1:3091';
const tenant = '00000000-0000-4000-8000-000000000001';
let token = '';
let refreshToken = '';
let accessExpiresAt = '';
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
  const login = await response.json();
  token = login.accessToken;
  refreshToken = login.refreshToken;
  accessExpiresAt = login.expiresAt;
});
test('manager opens the auditable customer chain from the asset list', async ({ page }) => {
  await page.addInitScript(
    ({ accessToken, refreshToken, accessExpiresAt }) => {
      sessionStorage.setItem('oneday.accessToken', accessToken);
      sessionStorage.setItem('oneday.refreshToken', refreshToken);
      sessionStorage.setItem('oneday.accessExpiresAt', accessExpiresAt);
    },
    { accessToken: token, refreshToken, accessExpiresAt },
  );
  await page.goto('/m/customers');
  await expect(page.locator('table')).toBeVisible();
  await page.locator('tbody a').first().click();
  await expect(page.getByRole('heading', { level: 2, name: '可审计时间线' })).toBeVisible();
  await expect(page.getByText('订单与证据')).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-M-004/management-customer-detail-desktop-v3.png',
    fullPage: false,
  });
});
test('customer detail recovers without a management session', async ({ page }) => {
  await page.goto('/m/customers/00000000-0000-4000-8000-000000000001');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { name: '管理端登录' })).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-M-004/management-customer-detail-forbidden-v2.png',
    fullPage: true,
  });
});
