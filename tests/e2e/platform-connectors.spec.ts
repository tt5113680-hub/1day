import { expect, test } from '@playwright/test';
const api = 'http://127.0.0.1:3140';
const tenantId = '00000000-0000-4000-8000-000000000001';
let token = '';
let refreshToken = '';
test.beforeAll(async () => {
  const r = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin@system.local', password: 'ChangeMe123!', tenantId }),
  });
  expect(r.status).toBe(201);
  ({ accessToken: token, refreshToken } = await r.json());
});
test('platform admin defines connector and records health observation', async ({ page }) => {
  await page.addInitScript(
    ([access, refresh]) => {
      sessionStorage.setItem('oneday.accessToken', access);
      sessionStorage.setItem('oneday.refreshToken', refresh);
      sessionStorage.setItem('oneday.accessExpiresAt', String(Date.now() + 15 * 60 * 1000));
    },
    [token, refreshToken],
  );
  await page.goto('/p/connectors');
  await expect(page.getByRole('heading', { name: /定义、租户授权/ })).toBeVisible();
  const connectorCode = `browser-connector-${Date.now()}`;
  await page.locator('input').nth(0).fill(connectorCode);
  await page.locator('input').nth(1).fill('Browser Connector');
  await page.getByRole('button', { name: '保存连接器定义' }).click();
  await expect(page.getByRole('status')).toBeVisible();
  const createdConnector = page.getByRole('article').filter({ hasText: connectorCode });
  await expect(createdConnector).toBeVisible();
  await createdConnector.getByRole('button', { name: '记录健康观察' }).click();
  await expect(page.getByRole('status')).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-P-007/platform-connectors-desktop.png',
    fullPage: false,
  });
});
test('platform connectors reject a missing session', async ({ page }) => {
  await page.goto('/p/connectors');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading')).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-P-007/platform-connectors-forbidden.png',
    fullPage: true,
  });
});
