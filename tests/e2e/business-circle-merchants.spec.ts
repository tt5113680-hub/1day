import { expect, test } from '@playwright/test';

const api = 'http://127.0.0.1:3155';
let session = { accessToken: '', refreshToken: '', expiresAt: '' };
test.beforeAll(async () => {
  const login = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@system.local',
      password: 'ChangeMe123!',
      tenantId: '00000000-0000-4000-8000-000000000001',
    }),
  });
  expect(login.status).toBe(201);
  const loginData = await login.json();
  session = {
    accessToken: loginData.accessToken,
    refreshToken: loginData.refreshToken,
    expiresAt: loginData.expiresAt,
  };
});
test('circle manager sees prepared invitations and approval controls', async ({ page }) => {
  await page.addInitScript((value) => {
    sessionStorage.setItem('oneday.accessToken', value.accessToken);
    sessionStorage.setItem('oneday.refreshToken', value.refreshToken);
    sessionStorage.setItem('oneday.accessExpiresAt', value.expiresAt);
  }, session);
  await page.goto('/bc/merchants');
  await expect(page.locator('h1')).toContainText('邀请、双重审批并展示已批准商户');
  await expect(page.getByText('商户审核队列')).toBeVisible();
  await page.screenshot({
    path: 'evidence/CIRCLE-002/business-circle-merchants-desktop-v2.png',
    fullPage: false,
  });
});
test('circle merchant management rejects a missing session', async ({ page }) => {
  await page.goto('/bc/merchants');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator('h1')).toContainText('平台登录');
  await page.screenshot({
    path: 'evidence/CIRCLE-002/business-circle-merchants-forbidden-v2.png',
    fullPage: true,
  });
});
