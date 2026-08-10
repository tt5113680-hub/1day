import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const api = 'http://127.0.0.1:3297';
const consumer = 'http://localhost:3299';
const system = '00000000-0000-4000-8000-000000000001';

test('ONE-CODE consumer landing resolves into entry with source continuity', async ({ page }) => {
  mkdirSync('evidence/SYS-22', { recursive: true });
  const login = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@system.local',
      password: 'ChangeMe123!',
      tenantId: system,
    }),
  });
  expect(login.status).toBe(201);
  const { accessToken } = (await login.json()) as { accessToken: string };
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const slug = `s22-${stamp}`.slice(0, 32);
  const created = await fetch(`${api}/api/v1/platform/onboarding`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      'idempotency-key': randomUUID(),
      'x-request-id': randomUUID(),
    },
    body: JSON.stringify({
      slug,
      tenantName: `SYS22 Land ${stamp}`,
      organizationName: 'SYS22 HQ',
      merchantName: 'SYS22 Merchant',
      storeName: 'SYS22 Store',
      address: '88 SYS22 Road',
      phone: '021-55552201',
      businessHours: '09:00-21:00',
      adminName: 'SYS22 Owner',
      adminEmail: `${slug}@example.test`,
      adminPassword: `Sys22-${stamp}-Password!`,
      industry: 'restaurant',
      plan: 'starter',
    }),
  });
  expect(created.status).toBe(201);
  const run = (await created.json()).data as {
    state: string;
    delivery: { oneCode: string; landingPath: string };
  };
  expect(run.state).toBe('ready');
  expect(run.delivery.landingPath).toBe(`/c/one-code/${run.delivery.oneCode}`);

  await page.goto(`${consumer}${run.delivery.landingPath}`);
  await expect(page.getByTestId('one-code-landing')).toBeVisible();
  await page.waitForURL(/\/c\/entry\?/, { timeout: 15000 });
  const url = new URL(page.url());
  expect(url.pathname).toBe('/c/entry');
  expect(url.searchParams.get('source')).toBe(`one-code:${run.delivery.oneCode}`);
  expect(url.searchParams.get('tenant')).toBe(slug);
  await page.screenshot({
    path: 'evidence/SYS-22/one-code-landing.png',
    fullPage: true,
  });
});

test('ONE-CODE landing shows honest missing state', async ({ page }) => {
  await page.goto(`${consumer}/c/one-code/DOESNOTEXISTCODE12AB`);
  await expect(page.getByTestId('one-code-landing-missing')).toBeVisible({ timeout: 10000 });
  await expect(page.getByTestId('one-code-landing-missing')).toContainText('不是第三方');
});
