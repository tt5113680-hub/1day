import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const api = 'http://127.0.0.1:3337';
const management = 'http://localhost:3340';
const tenant = '00000000-0000-4000-8000-000000000001';

const orphans = [
  { label: '员工过程', path: '/m/employee-process-performance', heading: /员工/ },
  { label: 'AI 建议', path: '/m/ai-suggestions', heading: /建议|AI/ },
  { label: '连接器意图', path: '/m/connectors', heading: /连接器|意图|授权/ },
  { label: '权限审计', path: '/m/permission-audit', heading: /审计|权限/ },
];

test('SYS-26 Management shell surfaces former orphan nav entries', async ({ page }) => {
  mkdirSync('evidence/SYS-26', { recursive: true });
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
  for (const orphan of orphans) {
    const link = page.getByRole('link', { name: orphan.label });
    await expect(link).toBeVisible({ timeout: 15000 });
    await expect(link).toHaveAttribute('href', orphan.path);
  }
  await page.screenshot({
    path: 'evidence/SYS-26/management-orphan-nav.png',
    fullPage: false,
  });

  await page.getByRole('link', { name: '连接器意图' }).click();
  await expect(page).toHaveURL(/\/m\/connectors/);
  await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15000 });
  await page.screenshot({
    path: 'evidence/SYS-26/management-connectors-from-nav.png',
    fullPage: false,
  });
});
