import { expect, test } from '@playwright/test';

const api = 'http://127.0.0.1:3127';
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

test('platform admin completes the tenant onboarding wizard', async ({ page }) => {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const slug = `browser-${suffix}`;
  await page.addInitScript(
    ({ accessToken, refresh }) => {
      sessionStorage.setItem('oneday.accessToken', accessToken);
      sessionStorage.setItem('oneday.refreshToken', refresh);
      sessionStorage.setItem('oneday.accessExpiresAt', String(Date.now() + 30 * 60 * 1000));
    },
    { accessToken: token, refresh: refreshToken },
  );
  await page.goto('/p/tenants/new');
  await expect(page.getByRole('heading', { name: /一次提交完成主体/ })).toBeVisible();
  const inputs = page.locator('input');
  await inputs.nth(0).fill(slug);
  await inputs.nth(1).fill(`Browser ${suffix}`);
  await inputs.nth(2).fill('Browser HQ');
  await inputs.nth(3).fill('Browser Main');
  await inputs.nth(4).fill('Browser Owner');
  await inputs.nth(5).fill(`browser-owner-${suffix}@example.test`);
  await inputs.nth(6).fill(`Browser-${suffix}-Password!`);
  await page.locator('select').selectOption('service');
  await page.getByRole('button', { name: '提交并初始化' }).click();
  await expect(page.getByRole('status')).toContainText(slug);
  await page.screenshot({
    path: 'evidence/PAGE-P-003/platform-onboarding-desktop.png',
    fullPage: false,
  });
});

test('onboarding page redirects to secure sign-in without a session', async ({ page }) => {
  await page.goto('/p/tenants/new');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading')).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-P-003/platform-onboarding-forbidden.png',
    fullPage: true,
  });
});
