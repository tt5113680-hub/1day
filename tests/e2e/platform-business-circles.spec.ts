import { expect, test } from '@playwright/test';

const api = 'http://127.0.0.1:3134';
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

test('platform admin creates and approves an explicitly recommended business-circle merchant', async ({
  page,
}) => {
  await page.addInitScript(
    ({ accessToken, refresh }) => {
      sessionStorage.setItem('oneday.accessToken', accessToken);
      sessionStorage.setItem('oneday.refreshToken', refresh);
      sessionStorage.setItem('oneday.accessExpiresAt', String(Date.now() + 30 * 60 * 1000));
    },
    { accessToken: token, refresh: refreshToken },
  );
  await page.goto('/p/business-circles');
  await expect(page.getByRole('heading', { name: /固定商圈、推荐商户与平台审批/ })).toBeVisible();
  const select = page.locator('select');
  expect(await select.locator('option').count()).toBeGreaterThan(1);
  const circleCode = `browser-circle-${Date.now()}`;
  await page.locator('input').nth(0).fill(circleCode);
  await page.locator('input').nth(1).fill('Browser Circle');
  await page.locator('input').nth(2).fill('Explicit merchant membership');
  await select.selectOption({ index: 1 });
  await page.locator('textarea').nth(0).fill('Priority placement\nQuarterly review');
  await page.locator('textarea').nth(1).fill('Verified local partner');
  await page
    .locator('button')
    .filter({ hasText: /建立商圈/ })
    .click();
  await expect(page.getByRole('status')).toBeVisible();
  const createdCircle = page.getByRole('article').filter({ hasText: circleCode });
  const approveButton = createdCircle.getByRole('button', { name: '批准加入' });
  await expect(approveButton).toBeVisible();
  await approveButton.click();
  await expect(page.getByRole('status')).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-P-005/platform-business-circles-desktop.png',
    fullPage: false,
  });
});

test('platform business-circle management redirects to secure sign-in without a session', async ({
  page,
}) => {
  await page.goto('/p/business-circles');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading')).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-P-005/platform-business-circles-forbidden.png',
    fullPage: true,
  });
});
