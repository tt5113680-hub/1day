import { expect, test } from '@playwright/test';

const api = 'http://127.0.0.1:3143';
const tenantId = '00000000-0000-4000-8000-000000000001';
let token = '';
let refreshToken = '';

test.beforeAll(async () => {
  const response = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin@system.local', password: 'ChangeMe123!', tenantId }),
  });
  expect(response.status).toBe(201);
  ({ accessToken: token, refreshToken } = await response.json());
});

test('platform operator locates and dispositions a security risk signal', async ({ page }) => {
  await page.addInitScript(
    ([access, refresh]) => {
      sessionStorage.setItem('oneday.accessToken', access);
      sessionStorage.setItem('oneday.refreshToken', refresh);
      sessionStorage.setItem('oneday.accessExpiresAt', String(Date.now() + 15 * 60 * 1000));
    },
    [token, refreshToken],
  );
  await page.goto('/p/security-audit');
  await expect(page.getByRole('heading', { name: /风险信号、越权审计/ })).toBeVisible();
  const action = page.getByRole('button', { name: /确认处置|更新处置/ }).first();
  await expect(action).toBeVisible();
  await action.click();
  await expect(page.getByRole('status')).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-P-008/platform-security-audit-desktop.png',
    fullPage: false,
  });
});

test('platform security audit rejects a missing session', async ({ page }) => {
  await page.goto('/p/security-audit');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading')).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-P-008/platform-security-audit-forbidden.png',
    fullPage: true,
  });
});
