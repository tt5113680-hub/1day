import { expect, test } from '@playwright/test';
const api = 'http://127.0.0.1:3111',
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
test('manager creates a content draft at desktop width', async ({ page }) => {
  await page.addInitScript(
    ([access, refresh]) => {
      sessionStorage.setItem('oneday.accessToken', access);
      sessionStorage.setItem('oneday.refreshToken', refresh);
      sessionStorage.setItem('oneday.accessExpiresAt', String(Date.now() + 15 * 60 * 1000));
    },
    [token, refreshToken],
  );
  await page.goto('/m/content');
  await expect(
    page.getByRole('heading', { name: '让内容生产、审批与渠道连接保持可追溯' }),
  ).toBeVisible();
  const title = `浏览器验收内容-${Date.now()}`;
  await page.getByLabel('文章标题').fill(title);
  await page.getByRole('button', { name: '创建草稿' }).click();
  await expect(page.getByRole('status')).toBeVisible();
  await expect(page.getByText(title)).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-M-013/management-content-desktop-v2.png',
    fullPage: false,
  });
});
test('content center recovers without a session', async ({ page }) => {
  await page.goto('/m/content');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading')).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-M-013/management-content-forbidden.png',
    fullPage: true,
  });
});
