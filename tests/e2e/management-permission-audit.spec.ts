import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';

const tenant = '00000000-0000-4000-8000-000000000001';
const api = 'http://127.0.0.1:3105';
let token = '';
let refreshToken = '';
let accessExpiresAt = '';

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
  const login = await response.json();
  token = login.accessToken;
  refreshToken = login.refreshToken;
  accessExpiresAt = login.accessExpiresAt;
  const headers = {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
    'x-request-id': randomUUID(),
  };
  const created = await fetch(`${api}/api/v1/rbac/roles`, {
    method: 'POST',
    headers: { ...headers, 'idempotency-key': randomUUID() },
    body: JSON.stringify({ code: `audit_browser_${Date.now()}`, name: 'Audit browser role' }),
  });
  expect(created.status).toBe(201);
  const role = (await created.json()).data;
  const changed = await fetch(`${api}/api/v1/rbac/roles/${role.id}/permissions`, {
    method: 'POST',
    headers: { ...headers, 'x-request-id': randomUUID() },
    body: JSON.stringify({
      version: role.version,
      permissionCodes: ['tenant.manage'],
      reason: 'PAGE-M-010 browser acceptance',
      confirmation: 'CONFIRM_PERMISSION_CHANGE',
    }),
  });
  expect(changed.status).toBe(201);
});

test('manager filters audit records and opens persisted evidence at desktop width', async ({
  page,
}) => {
  await page.addInitScript(
    ({ accessToken, refreshToken, accessExpiresAt }) => {
      sessionStorage.setItem('oneday.accessToken', accessToken);
      sessionStorage.setItem('oneday.refreshToken', refreshToken);
      sessionStorage.setItem('oneday.accessExpiresAt', accessExpiresAt);
    },
    { accessToken: token, refreshToken, accessExpiresAt },
  );
  await page.goto('/m/permission-audit');
  await expect(
    page.getByRole('heading', { name: '将权限变更、风险信号与证据链放在同一审计视图' }),
  ).toBeVisible();
  await page.getByLabel('审计类型').selectOption('risk');
  await expect(page.getByText('高权限扩展信号').first()).toBeVisible();
  await page.getByRole('button', { name: '查看证据' }).first().click();
  await expect(page.getByText('Trace ID')).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-M-010/management-permission-audit-desktop-v2.png',
    fullPage: false,
  });
});

test('permission audit recovers without a session', async ({ page }) => {
  await page.goto('/m/permission-audit');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { name: '管理端登录' })).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-M-010/management-permission-audit-forbidden-v2.png',
    fullPage: true,
  });
});
