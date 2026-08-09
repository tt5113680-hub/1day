import { expect, test } from '@playwright/test';

const api = 'http://127.0.0.1:3085';
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

test('manager sees confirmed and inferred funnel states at desktop width', async ({ page }) => {
  await page.addInitScript(
    ({ accessToken, refreshToken, accessExpiresAt }) => {
      sessionStorage.setItem('oneday.accessToken', accessToken);
      sessionStorage.setItem('oneday.refreshToken', refreshToken);
      sessionStorage.setItem('oneday.accessExpiresAt', accessExpiresAt);
    },
    { accessToken: token, refreshToken, accessExpiresAt },
  );
  await page.goto('/m/funnels/campaign');
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('main')).toContainText('暂不可确认');
  await expect(page.locator('main')).toContainText('确认结果');
  await page.screenshot({
    path: 'evidence/PAGE-M-002/management-funnel-desktop-v2.png',
    fullPage: false,
  });
});

test('funnel recovers without a session', async ({ page }) => {
  await page.goto('/m/funnels/campaign');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { name: '管理端登录' })).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-M-002/management-funnel-forbidden-v2.png',
    fullPage: true,
  });
});
