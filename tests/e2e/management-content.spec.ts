import { expect, test } from '@playwright/test';
const api = 'http://127.0.0.1:3111',
  tenant = '00000000-0000-4000-8000-000000000001';
let token = '';
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
  token = (await r.json()).accessToken;
});
test('manager creates a content draft at desktop width', async ({ page }) => {
  await page.addInitScript((v) => sessionStorage.setItem('oneday.accessToken', v), token);
  await page.goto('/m/content');
  await expect(
    page.getByRole('heading', { name: '让内容生产、审批与渠道连接保持可追溯' }),
  ).toBeVisible();
  await page.getByLabel('文章标题').fill('浏览器验收内容');
  await page.getByRole('button', { name: '创建草稿' }).click();
  await expect(page.getByRole('status')).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-M-013/management-content-desktop.png',
    fullPage: false,
  });
});
test('content center recovers without a session', async ({ page }) => {
  await page.goto('/m/content');
  await expect(page.getByRole('heading', { name: '无权查看内容中心' })).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-M-013/management-content-forbidden.png',
    fullPage: true,
  });
});
