import { expect, test } from '@playwright/test';

const api = 'http://127.0.0.1:3088';
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

test('manager filters customer assets and submits an export approval request at desktop width', async ({
  page,
}) => {
  await page.addInitScript((value) => sessionStorage.setItem('oneday.accessToken', value), token);
  await page.goto('/m/customers');
  await expect(page.getByRole('heading', { name: '按来源与分层组织推广跟进作业' })).toBeVisible();
  await expect(page.locator('table')).toBeVisible();
  await page.getByLabel('标签').fill('VIP');
  await page.getByRole('button', { name: '应用筛选' }).click();
  await expect(page.getByRole('button', { name: '申请导出' })).toBeVisible();
  await page.getByRole('button', { name: '申请导出' }).click();
  await expect(page.getByRole('status')).toContainText('导出申请已提交');
  await page.screenshot({
    path: 'evidence/PAGE-M-003/management-customers-desktop.png',
    fullPage: false,
  });
});

test('customer assets shows a permission recovery state without a session', async ({ page }) => {
  await page.goto('/m/customers');
  await expect(page.getByRole('heading', { name: '无权访问客户跟进' })).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-M-003/management-customers-forbidden.png',
    fullPage: true,
  });
});
