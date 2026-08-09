import { expect, test } from '@playwright/test';

const api = 'http://127.0.0.1:3131';
const systemTenant = '00000000-0000-4000-8000-000000000001';
let token = '';
let refreshToken = '';

test.beforeAll(async () => {
  const response = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@system.local',
      password: 'ChangeMe123!',
      tenantId: systemTenant,
    }),
  });
  expect(response.status).toBe(201);
  ({ accessToken: token, refreshToken } = (await response.json()) as {
    accessToken: string;
    refreshToken: string;
  });
});

test('platform admin creates a first-level channel from the merchant pool', async ({ page }) => {
  await page.addInitScript(
    ({ accessToken, refresh }) => {
      sessionStorage.setItem('oneday.accessToken', accessToken);
      sessionStorage.setItem('oneday.refreshToken', refresh);
      sessionStorage.setItem('oneday.accessExpiresAt', String(Date.now() + 30 * 60 * 1000));
    },
    { accessToken: token, refresh: refreshToken },
  );
  await page.goto('/p/channels');
  await expect(page.getByRole('heading', { name: '一级渠道、商户池与服务状态' })).toBeVisible();
  const select = page.getByLabel('商户池租户');
  expect(await select.locator('option').count()).toBeGreaterThan(1);
  await page.getByLabel('渠道编码').fill(`browser-channel-${Date.now()}`);
  await page.getByLabel('渠道名称').fill('Browser Channel');
  await select.selectOption({ index: 1 });
  await page.getByRole('button', { name: '创建渠道并纳入商户' }).click();
  await expect(page.getByRole('status')).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-P-004/platform-channels-desktop.png',
    fullPage: false,
  });
});

test('platform channel management redirects to secure sign-in without a session', async ({ page }) => {
  await page.goto('/p/channels');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading')).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-P-004/platform-channels-forbidden.png',
    fullPage: true,
  });
});
