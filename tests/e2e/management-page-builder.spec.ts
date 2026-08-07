import { expect, test } from '@playwright/test';
const api = 'http://127.0.0.1:3113',
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
  const c = await fetch(`${api}/api/v1/page-templates`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'x-request-id': crypto.randomUUID(),
      'idempotency-key': crypto.randomUUID(),
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      code: `builder_${Date.now()}`,
      name: 'Builder acceptance',
      target: 'consumer',
      modules: [
        { moduleType: 'hero', config: {} },
        { moduleType: 'content', config: {} },
      ],
    }),
  });
  expect(c.status).toBe(201);
});
test('manager previews fixed modules at desktop width', async ({ page }) => {
  await page.addInitScript((v) => sessionStorage.setItem('oneday.accessToken', v), token);
  await page.goto('/m/page-builder');
  await expect(
    page.getByRole('heading', { name: '在固定业务模块内维护模板、预览与版本' }),
  ).toBeVisible();
  await page.getByRole('button', { name: '实时预览' }).first().click();
  await expect(page.getByRole('heading', { name: '预览画布' })).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-M-014/management-page-builder-desktop.png',
    fullPage: false,
  });
});
test('page builder recovers without a session', async ({ page }) => {
  await page.goto('/m/page-builder');
  await expect(page.getByRole('heading', { name: '无权查看页面装修' })).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-M-014/management-page-builder-forbidden.png',
    fullPage: true,
  });
});
