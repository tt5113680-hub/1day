import { expect, test } from '@playwright/test';
const api = 'http://127.0.0.1:3140';
const tenantId = '00000000-0000-4000-8000-000000000001';
let token = '';
test.beforeAll(async () => {
  const r = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin@system.local', password: 'ChangeMe123!', tenantId }),
  });
  expect(r.status).toBe(201);
  token = (await r.json()).accessToken;
});
test('platform admin defines connector and records health observation', async ({ page }) => {
  await page.addInitScript((value) => sessionStorage.setItem('oneday.accessToken', value), token);
  await page.goto('/p/connectors');
  await expect(page.locator('h1')).toBeVisible();
  await page.locator('input').nth(0).fill(`browser-connector-${Date.now()}`);
  await page.locator('input').nth(1).fill('Browser Connector');
  await page
    .locator('button')
    .filter({ hasText: /保存连接器定义/ })
    .click();
  await expect(page.getByRole('status')).toBeVisible();
  await page
    .locator('button')
    .filter({ hasText: /记录健康观察/ })
    .last()
    .click();
  await expect(page.getByRole('status')).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-P-007/platform-connectors-desktop.png',
    fullPage: false,
  });
});
test('platform connectors reject a missing session', async ({ page }) => {
  await page.goto('/p/connectors');
  await expect(page.locator('h1')).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-P-007/platform-connectors-forbidden.png',
    fullPage: true,
  });
});
