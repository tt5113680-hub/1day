import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const api = 'http://127.0.0.1:3307';
const management = 'http://localhost:3310';
const tenant = '00000000-0000-4000-8000-000000000001';

test('SYS-23 Management shell surfaces attribution nav and opens /m/attribution', async ({
  page,
}) => {
  mkdirSync('evidence/SYS-23', { recursive: true });
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
  const navLink = page.getByRole('link', { name: '来源归因' });
  await expect(navLink).toBeVisible({ timeout: 15000 });
  await expect(navLink).toHaveAttribute('href', '/m/attribution');
  await page.screenshot({
    path: 'evidence/SYS-23/management-attribution-nav.png',
    fullPage: false,
  });

  await navLink.click();
  await expect(page).toHaveURL(/\/m\/attribution/);
  await expect(
    page.getByRole('heading', { name: '从首次触达，到当前经营与最终结果' }),
  ).toBeVisible({ timeout: 15000 });
  await page.screenshot({
    path: 'evidence/SYS-23/management-attribution-from-nav.png',
    fullPage: false,
  });
});
