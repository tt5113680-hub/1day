import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const api = 'http://127.0.0.1:3346';
const platform = 'http://localhost:3348';
const tenant = '00000000-0000-4000-8000-000000000001';

async function signIn(page: import('@playwright/test').Page) {
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
}

test('P1-B Platform shell chrome renders the token-driven AdminShell + product home across viewports', async ({
  page,
}) => {
  test.setTimeout(120000);
  mkdirSync('evidence/P1-B-PLATFORM-SHELL', { recursive: true });
  await signIn(page);

  // Desktop (1440px): shared AdminShell sidebar + 平台治理 nav group + product home.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${platform}/p/dashboard`);
  const sidebar = page.getByRole('complementary', { name: '平台运营 主导航' });
  await expect(sidebar).toBeVisible({ timeout: 30000 });
  await expect(sidebar.getByText('平台治理', { exact: true })).toBeVisible();
  await expect(sidebar.locator('.od-admin-shell__nav-link--active')).toHaveCount(1);
  const home = page.getByLabel('平台运营角色首页');
  await expect(home).toBeVisible({ timeout: 30000 });
  await expect(home.getByText('平台运营首页')).toBeVisible();
  const switcher = home.locator('nav[aria-label="产品工作区切换"]');
  if ((await switcher.count()) > 0) {
    await expect(switcher.first()).toBeVisible();
  }
  await page.screenshot({
    path: 'evidence/P1-B-PLATFORM-SHELL/platform-shell-desktop-1440.png',
    fullPage: true,
  });

  // Tablet (768px): shell rail + product chrome stay usable.
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.reload();
  await expect(sidebar).toBeVisible({ timeout: 30000 });
  await expect(sidebar.locator('.od-admin-shell__nav-link--active')).toHaveCount(1);
  await expect(home).toBeVisible({ timeout: 30000 });
  await page.screenshot({
    path: 'evidence/P1-B-PLATFORM-SHELL/platform-shell-tablet-768.png',
    fullPage: true,
  });

  // Mobile (390px): product home + topbar chrome remain available without overlap.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(sidebar).toBeVisible({ timeout: 30000 });
  await expect(sidebar.locator('.od-admin-shell__brand')).toContainText('ONEDAY');
  await expect(home).toBeVisible({ timeout: 30000 });
  await page.screenshot({
    path: 'evidence/P1-B-PLATFORM-SHELL/platform-shell-mobile-390.png',
    fullPage: true,
  });
});
