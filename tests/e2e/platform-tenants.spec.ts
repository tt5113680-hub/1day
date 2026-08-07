import { expect, test } from '@playwright/test';
const api = 'http://127.0.0.1:3123',
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
test('platform admin updates a tenant after second confirmation', async ({ page }) => {
  await page.addInitScript((v) => sessionStorage.setItem('oneday.accessToken', v), token);
  await page.goto('/p/tenants');
  await expect(page.getByRole('heading', { name: '租户开通、暂停与经营边界' })).toBeVisible();
  await page.getByLabel('套餐').selectOption('enterprise');
  await page.getByLabel('用户配额').fill('80');
  await page.getByLabel('二次确认').fill('ACTIVATE:system');
  await page.getByRole('button', { name: '保存租户设置' }).click();
  await expect(page.getByRole('status')).toContainText('已保存');
  await page.screenshot({
    path: 'evidence/PAGE-P-002/platform-tenants-desktop.png',
    fullPage: false,
  });
});
test('tenant manager page rejects missing session', async ({ page }) => {
  await page.goto('/p/tenants');
  await expect(page.getByRole('heading', { name: '无权查看平台租户管理' })).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-P-002/platform-tenants-forbidden.png',
    fullPage: true,
  });
});
