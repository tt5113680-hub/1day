import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const api = 'http://127.0.0.1:3326';
const management = 'http://localhost:3327';
const platform = 'http://localhost:3328';
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

test('P1-B Management/Platform AdminShell renders the shared token chrome across viewports', async ({
  page,
}) => {
  test.setTimeout(120000);
  mkdirSync('evidence/P1-B-MANAGEMENT-SHELL', { recursive: true });
  await signIn(page);

  // Desktop (1440px): Management sidebar nav groups + topbar.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${management}/`);
  const sidebar = page.getByRole('complementary', { name: '商户经营 主导航' });
  await expect(sidebar).toBeVisible({ timeout: 30000 });
  await expect(sidebar.getByText('经营运营')).toBeVisible();
  await expect(sidebar.getByText('组织与权限')).toBeVisible();
  await expect(sidebar.getByRole('link', { name: '客户资产' })).toHaveAttribute(
    'href',
    /\/m\/customers/,
  );
  await expect(sidebar.locator('.od-admin-shell__nav-link--active')).toHaveCount(1);
  await page.screenshot({
    path: 'evidence/P1-B-MANAGEMENT-SHELL/management-shell-desktop-1440.png',
    fullPage: true,
  });

  // Tablet (768px): sidebar becomes a horizontal nav rail; shell stays usable.
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.reload();
  await expect(sidebar).toBeVisible({ timeout: 30000 });
  await expect(sidebar.locator('.od-admin-shell__nav-link--active')).toHaveCount(1);
  await page.screenshot({
    path: 'evidence/P1-B-MANAGEMENT-SHELL/management-shell-tablet-768.png',
    fullPage: true,
  });

  // Mobile (390px): horizontal scroll nav in the sidebar rail, content below.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(sidebar).toBeVisible({ timeout: 30000 });
  await expect(sidebar.locator('.od-admin-shell__brand')).toContainText('ONEDAY');
  await page.screenshot({
    path: 'evidence/P1-B-MANAGEMENT-SHELL/management-shell-mobile-390.png',
    fullPage: true,
  });
});

test('P1-B Platform inherits the shared AdminShell token chrome under its own product mode', async ({
  page,
}) => {
  test.setTimeout(120000);
  await signIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${platform}/p/dashboard`);
  const sidebar = page.getByRole('complementary', { name: '平台运营 主导航' });
  await expect(sidebar).toBeVisible({ timeout: 30000 });
  await expect(sidebar.getByText('平台治理', { exact: true })).toBeVisible();
  await expect(sidebar.locator('.od-admin-shell__nav-link--active')).toHaveCount(1);
  await page.screenshot({
    path: 'evidence/P1-B-MANAGEMENT-SHELL/platform-shell-desktop-1440.png',
    fullPage: true,
  });
});
