import { expect, test } from '@playwright/test';
const api = 'http://127.0.0.1:3109',
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
test('manager filters attributable source records at desktop width', async ({ page }) => {
  await page.addInitScript((v) => sessionStorage.setItem('oneday.accessToken', v), token);
  await page.goto('/m/attribution');
  await expect(
    page.getByRole('heading', { name: '从首次触达，到当前经营与最终结果' }),
  ).toBeVisible();
  await page.getByLabel('归因阶段').selectOption('first_source');
  await page.screenshot({
    path: 'evidence/PAGE-M-012/management-attribution-desktop.png',
    fullPage: false,
  });
});
test('attribution recovers without a session', async ({ page }) => {
  await page.goto('/m/attribution');
  await expect(page.getByRole('heading', { name: '无权查看来源归因' })).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-M-012/management-attribution-forbidden.png',
    fullPage: true,
  });
});
