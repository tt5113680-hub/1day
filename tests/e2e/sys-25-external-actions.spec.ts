import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const api = 'http://127.0.0.1:3327';
const management = 'http://localhost:3330';
const tenant = '00000000-0000-4000-8000-000000000001';

test('SYS-25 Management can create tenant external-actions from catalog page', async ({ page }) => {
  mkdirSync('evidence/SYS-25', { recursive: true });
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
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const code = `ui25-${stamp}`.slice(0, 32);

  await page.addInitScript(
    ([access, refresh]) => {
      sessionStorage.setItem('oneday.accessToken', access);
      sessionStorage.setItem('oneday.refreshToken', refresh);
      sessionStorage.setItem('oneday.accessExpiresAt', String(Date.now() + 15 * 60 * 1000));
    },
    [accessToken, refreshToken],
  );

  await page.goto(`${management}/`);
  const nav = page.getByRole('link', { name: '外链动作目录' });
  await expect(nav).toBeVisible({ timeout: 15000 });
  await nav.click();
  await expect(page).toHaveURL(/\/m\/external-actions/);
  await expect(page.getByTestId('external-action-create')).toBeVisible();
  await page.getByLabel('动作编码').fill(code);
  await page.getByLabel('动作名称').fill(`SYS25 UI ${stamp}`);
  await page.getByLabel('动作类型').selectOption('link');
  await page.getByLabel('目标 URL').fill('https://example.test/sys25-ui');
  await page.getByRole('button', { name: '创建外链动作' }).click();
  await expect(page.getByRole('status')).toContainText('外链动作已写入租户目录', {
    timeout: 15000,
  });
  await expect(page.getByText(`SYS25 UI ${stamp}`)).toBeVisible();
  await page.screenshot({
    path: 'evidence/SYS-25/external-actions-catalog.png',
    fullPage: false,
  });
});
