import { expect, test } from '@playwright/test';
const api = 'http://127.0.0.1:3117';
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
test('manager changes persisted tenant operating settings', async ({ page }) => {
  await page.addInitScript(
    ([access, refresh]) => {
      sessionStorage.setItem('oneday.accessToken', access);
      sessionStorage.setItem('oneday.refreshToken', refresh);
      sessionStorage.setItem('oneday.accessExpiresAt', String(Date.now() + 15 * 60 * 1000));
    },
    [token, refreshToken],
  );
  await page.goto('/m/settings');
  await expect(page.getByRole('heading')).toContainText('可审计经营规则');
  await page.getByLabel('默认时限').fill('18');
  await page.getByRole('button', { name: '保存经营设置' }).click();
  await expect(page.getByRole('status')).toContainText('已保存');
  await page.screenshot({
    path: 'evidence/PAGE-M-016/management-settings-desktop.png',
    fullPage: false,
  });
});
test('settings rejects missing session', async ({ page }) => {
  await page.goto('/m/settings');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading')).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-M-016/management-settings-forbidden.png',
    fullPage: true,
  });
});
