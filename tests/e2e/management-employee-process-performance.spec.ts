import { expect, test } from '@playwright/test';
const api = 'http://127.0.0.1:3107',
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
test('manager reviews employee process signals at desktop width', async ({ page }) => {
  await page.addInitScript((value) => sessionStorage.setItem('oneday.accessToken', value), token);
  await page.goto('/m/employee-process-performance');
  await expect(
    page.getByRole('heading', { name: '用任务、跟进、证据与贡献过程支持辅导' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: '过程视图' })).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-M-011/management-employee-process-performance-desktop.png',
    fullPage: false,
  });
});
test('employee performance recovers without a session', async ({ page }) => {
  await page.goto('/m/employee-process-performance');
  await expect(page.getByRole('heading', { name: '无权查看员工过程绩效' })).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-M-011/management-employee-process-performance-forbidden.png',
    fullPage: true,
  });
});
