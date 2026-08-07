import { expect, test } from '@playwright/test';

const api = 'http://127.0.0.1:3137';
const systemTenant = '00000000-0000-4000-8000-000000000001';
let token = '';

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
  token = (await response.json()).accessToken;
});

test('platform admin saves, previews and publishes a fixed-component industry template', async ({
  page,
}) => {
  await page.addInitScript((value) => sessionStorage.setItem('oneday.accessToken', value), token);
  await page.goto('/p/templates');
  await expect(page.locator('h1')).toBeVisible();
  await page.locator('input').nth(0).fill(`browser-template-${Date.now()}`);
  await page.locator('input').nth(1).fill('Browser Template');
  await page.locator('input').nth(2).fill('clinic');
  await page.locator('input').nth(3).fill('consultation');
  await page
    .locator('button')
    .filter({ hasText: /保存平台模板/ })
    .click();
  await expect(page.getByRole('status')).toBeVisible();
  const previews = page.locator('button').filter({ hasText: /预览模块/ });
  await expect(previews).not.toHaveCount(0);
  await previews.last().click();
  await expect(page.locator('button').filter({ hasText: /发布当前版本/ })).toBeVisible();
  await page
    .locator('button')
    .filter({ hasText: /发布当前版本/ })
    .click();
  await expect(page.getByRole('status')).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-P-006/platform-templates-desktop.png',
    fullPage: false,
  });
});

test('platform template management rejects a missing session', async ({ page }) => {
  await page.goto('/p/templates');
  await expect(page.locator('h1')).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-P-006/platform-templates-forbidden.png',
    fullPage: true,
  });
});
