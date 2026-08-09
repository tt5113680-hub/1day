import { expect, test } from '@playwright/test';

const api = 'http://127.0.0.1:3137';
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
  ({ accessToken: token, refreshToken } = await response.json());
});

test('platform admin saves, previews and publishes a fixed-component industry template', async ({
  page,
}) => {
  await page.addInitScript(
    ([access, refresh]) => {
      sessionStorage.setItem('oneday.accessToken', access);
      sessionStorage.setItem('oneday.refreshToken', refresh);
      sessionStorage.setItem('oneday.accessExpiresAt', String(Date.now() + 15 * 60 * 1000));
    },
    [token, refreshToken],
  );
  await page.goto('/p/templates');
  await expect(page.getByRole('heading', { name: /固定组件、行业配置/ })).toBeVisible();
  const templateCode = `browser-template-${Date.now()}`;
  await page.locator('input').nth(0).fill(templateCode);
  await page.locator('input').nth(1).fill('Browser Template');
  await page.locator('input').nth(2).fill('clinic');
  await page.locator('input').nth(3).fill('consultation');
  await page.getByRole('button', { name: '保存平台模板草稿' }).click();
  await expect(page.getByRole('status')).toBeVisible();
  const createdTemplate = page.getByRole('article').filter({ hasText: templateCode });
  await expect(createdTemplate).toBeVisible();
  await createdTemplate.getByRole('button', { name: '预览模块' }).click();
  await expect(page.getByRole('button', { name: '发布当前版本' })).toBeVisible();
  await page.getByRole('button', { name: '发布当前版本' }).click();
  await expect(page.getByRole('status')).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-P-006/platform-templates-desktop.png',
    fullPage: false,
  });
});

test('platform template management rejects a missing session', async ({ page }) => {
  await page.goto('/p/templates');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading')).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-P-006/platform-templates-forbidden.png',
    fullPage: true,
  });
});
