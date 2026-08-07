import { expect, test } from '@playwright/test';

const api = 'http://127.0.0.1:3115';
const tenant = '00000000-0000-4000-8000-000000000001';
let token = '';

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
  token = (await response.json()).accessToken;
});

test('manager records an authorization request without exposing the secret', async ({ page }) => {
  await page.addInitScript((value) => sessionStorage.setItem('oneday.accessToken', value), token);
  await page.goto('/m/connectors');
  await expect(page.getByRole('heading', { name: '连接器授权与运行状态保持可验证' })).toBeVisible();
  await page.getByLabel('连接器', { exact: true }).selectOption('douyin');
  await page.getByLabel('授权密钥').fill('browser-only-secret');
  await page.getByRole('button', { name: '登记授权请求' }).click();
  await expect(page.getByRole('status')).toContainText('系统尚未调用外部平台');
  await expect(page.locator('body')).not.toContainText('browser-only-secret');
  await page.screenshot({
    path: 'evidence/PAGE-M-015/management-connectors-desktop.png',
    fullPage: false,
  });
});

test('connector manager recovers without a session', async ({ page }) => {
  await page.goto('/m/connectors');
  await expect(page.getByRole('heading', { name: '无权查看连接器管理' })).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-M-015/management-connectors-forbidden.png',
    fullPage: true,
  });
});
