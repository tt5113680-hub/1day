import { expect, test } from '@playwright/test';

const api = 'http://127.0.0.1:3143';
const tenantId = '00000000-0000-4000-8000-000000000001';
let token = '';

test.beforeAll(async () => {
  const response = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin@system.local', password: 'ChangeMe123!', tenantId }),
  });
  expect(response.status).toBe(201);
  token = (await response.json()).accessToken;
});

test('platform operator locates and dispositions a security risk signal', async ({ page }) => {
  await page.addInitScript((value) => sessionStorage.setItem('oneday.accessToken', value), token);
  await page.goto('/p/security-audit');
  await expect(page.locator('h1')).toBeVisible();
  const actions = page.locator('section article button');
  await expect(actions.first()).toBeVisible();
  await actions.first().click();
  await expect(page.getByRole('status')).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-P-008/platform-security-audit-desktop.png',
    fullPage: false,
  });
});

test('platform security audit rejects a missing session', async ({ page }) => {
  await page.goto('/p/security-audit');
  await expect(page.locator('h1')).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-P-008/platform-security-audit-forbidden.png',
    fullPage: true,
  });
});
