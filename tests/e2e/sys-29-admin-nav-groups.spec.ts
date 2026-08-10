import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const api = 'http://127.0.0.1:3346';
const management = 'http://localhost:3347';
const tenant = '00000000-0000-4000-8000-000000000001';

test('SYS-29 Management AdminShell renders role-package nav groups', async ({ page }) => {
  mkdirSync('evidence/SYS-29', { recursive: true });
  const login = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@system.local',
      password: 'ChangeMe123!',
      tenantId: tenant,
    }),
  });
  expect(login.status).toBe(201);
  const { accessToken, refreshToken } = (await login.json()) as {
    accessToken: string;
    refreshToken: string;
  };

  await page.addInitScript(
    ([access, refresh]) => {
      sessionStorage.setItem('oneday.accessToken', access);
      sessionStorage.setItem('oneday.refreshToken', refresh);
      sessionStorage.setItem('oneday.accessExpiresAt', String(Date.now() + 15 * 60 * 1000));
    },
    [accessToken, refreshToken],
  );

  await page.goto(`${management}/`);
  const nav = page.getByRole('complementary', { name: '商户经营 主导航' });
  await expect(nav.getByText('经营运营')).toBeVisible({ timeout: 15000 });
  await expect(nav.getByText('门店与商品')).toBeVisible();
  await expect(nav.getByText('组织与权限')).toBeVisible();
  await expect(nav.getByText('能力边界')).toBeVisible();
  await expect(nav.getByRole('link', { name: '客户资产' })).toBeVisible();
  await expect(nav.getByRole('link', { name: '连接器意图' })).toBeVisible();
  await page.screenshot({
    path: 'evidence/SYS-29/management-nav-groups.png',
    fullPage: false,
  });
});
