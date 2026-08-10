import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const api = 'http://127.0.0.1:3353';
const management = 'http://localhost:3354';
const tenant = '00000000-0000-4000-8000-000000000001';

test('SYS-32 Management can update and archive external-actions', async ({ page }) => {
  mkdirSync('evidence/SYS-32', { recursive: true });
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
  const code = `ui32-${stamp}`.slice(0, 32);
  const name = `SYS32 UI ${stamp}`;
  const updatedName = `SYS32 UI Updated ${stamp}`;

  await page.addInitScript(
    ([access, refresh]) => {
      sessionStorage.setItem('oneday.accessToken', access);
      sessionStorage.setItem('oneday.refreshToken', refresh);
      sessionStorage.setItem('oneday.accessExpiresAt', String(Date.now() + 15 * 60 * 1000));
    },
    [accessToken, refreshToken],
  );

  await page.goto(`${management}/m/external-actions`);
  await expect(page.getByTestId('external-action-create')).toBeVisible({ timeout: 15000 });
  await page.getByLabel('动作编码').fill(code);
  await page.getByLabel('动作名称').fill(name);
  await page.getByLabel('动作类型').selectOption('link');
  await page.getByLabel('目标 URL').fill('https://example.test/sys32-ui');
  await page.getByRole('button', { name: '创建外链动作' }).click();
  await expect(page.getByRole('status')).toContainText('外链动作已写入租户目录', {
    timeout: 15000,
  });
  await expect(page.getByText(name)).toBeVisible();

  const card = page
    .getByTestId('external-actions-catalog')
    .locator('[data-testid^="external-action-card-"]')
    .filter({ hasText: code });
  await expect(card).toHaveCount(1);
  await card.getByRole('button', { name: '编辑' }).click();
  await expect(page.getByTestId('external-action-edit')).toBeVisible();
  await page.getByLabel('编辑动作名称').fill(updatedName);
  await page.getByLabel('编辑目标 URL').fill('https://example.test/sys32-ui-updated');
  await page.getByRole('button', { name: '保存更新' }).click();
  await expect(page.getByRole('status')).toContainText('外链动作已更新', { timeout: 15000 });
  await expect(page.getByText(updatedName)).toBeVisible();
  await expect(page.getByText('https://example.test/sys32-ui-updated')).toBeVisible();

  const updatedCard = page
    .getByTestId('external-actions-catalog')
    .locator('[data-testid^="external-action-card-"]')
    .filter({ hasText: code });
  await updatedCard.getByRole('button', { name: '归档' }).click();
  await expect(page.getByRole('status')).toContainText('外链动作已归档', { timeout: 15000 });
  await expect(
    page.getByTestId('external-actions-catalog').getByText(updatedName),
  ).toHaveCount(0);

  await page.screenshot({
    path: 'evidence/SYS-32/external-actions-lifecycle.png',
    fullPage: false,
  });
});
