import { expect, test } from '@playwright/test';
const api = 'http://127.0.0.1:3109',
  tenant = '00000000-0000-4000-8000-000000000001';
let token = '';
let refreshToken = '';
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
  ({ accessToken: token, refreshToken } = await r.json());
});
test('manager filters attributable source records at desktop width', async ({ page }) => {
  await page.addInitScript(
    ([access, refresh]) => {
      sessionStorage.setItem('oneday.accessToken', access);
      sessionStorage.setItem('oneday.refreshToken', refresh);
      sessionStorage.setItem('oneday.accessExpiresAt', String(Date.now() + 15 * 60 * 1000));
    },
    [token, refreshToken],
  );
  await page.goto('/m/attribution');
  await expect(
    page.getByRole('heading', { name: '从首次触达，到当前经营与最终结果' }),
  ).toBeVisible();
  await page.getByLabel('归因阶段').selectOption('first_source');
  await page.screenshot({
    path: 'evidence/PAGE-M-012/management-attribution-desktop-v2.png',
    fullPage: false,
  });
});
test('attribution recovers without a session', async ({ page }) => {
  await page.goto('/m/attribution');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading')).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-M-012/management-attribution-forbidden.png',
    fullPage: true,
  });
});
