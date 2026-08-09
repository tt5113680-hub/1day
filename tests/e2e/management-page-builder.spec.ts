import { expect, test } from '@playwright/test';
const api = 'http://127.0.0.1:3113',
  tenant = '00000000-0000-4000-8000-000000000001';
let token = '';
let refreshToken = '';
let templateCode = '';
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
  templateCode = `builder_${Date.now()}`;
  const c = await fetch(`${api}/api/v1/page-templates`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'x-request-id': crypto.randomUUID(),
      'idempotency-key': crypto.randomUUID(),
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      code: templateCode,
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
  await page.addInitScript(
    ([access, refresh]) => {
      sessionStorage.setItem('oneday.accessToken', access);
      sessionStorage.setItem('oneday.refreshToken', refresh);
      sessionStorage.setItem('oneday.accessExpiresAt', String(Date.now() + 15 * 60 * 1000));
    },
    [token, refreshToken],
  );
  await page.goto('/m/page-builder');
  await expect(
    page.getByRole('heading', { name: '在固定业务模块内维护模板、预览与版本' }),
  ).toBeVisible();
  const template = page.getByRole('article').filter({ hasText: templateCode });
  await expect(template).toBeVisible();
  await template.getByRole('button', { name: '实时预览' }).click();
  await expect(page.getByRole('heading', { name: '预览画布' })).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-M-014/management-page-builder-desktop.png',
    fullPage: false,
  });
});
test('page builder recovers without a session', async ({ page }) => {
  await page.goto('/m/page-builder');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading')).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-M-014/management-page-builder-forbidden.png',
    fullPage: true,
  });
});
