import { expect, test } from '@playwright/test';

const api = 'http://127.0.0.1:3152';
const systemTenantId = '00000000-0000-4000-8000-000000000001';
let session = { accessToken: '', refreshToken: '', expiresAt: '' };

test.beforeAll(async () => {
  const login = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@system.local',
      password: 'ChangeMe123!',
      tenantId: systemTenantId,
    }),
  });
  expect(login.status).toBe(201);
  const loginData = await login.json();
  session = {
    accessToken: loginData.accessToken,
    refreshToken: loginData.refreshToken,
    expiresAt: loginData.expiresAt,
  };
  const headers = {
    authorization: `Bearer ${session.accessToken}`,
    'x-request-id': crypto.randomUUID(),
    'content-type': 'application/json',
  };
  const first = await fetch(`${api}/api/v1/platform/business-circles`, { headers });
  let data = (await first.json()).data;
  if (
    !data.circles.some((circle) =>
      circle.merchants.some((merchant) => merchant.approvalStatus === 'approved'),
    )
  ) {
    const created = await fetch(`${api}/api/v1/platform/business-circles`, {
      method: 'POST',
      headers: { ...headers, 'idempotency-key': crypto.randomUUID() },
      body: JSON.stringify({
        code: `browser-circle-${Date.now()}`,
        name: 'Browser Fixed Circle',
        description: 'Browser evidence circle',
        merchantTenantId: data.merchantPool[0].tenantId,
        benefits: ['Browser benefit'],
        recommendationReason: 'Browser evidence recommendation',
      }),
    });
    expect(created.status).toBe(201);
    data = (await (await fetch(`${api}/api/v1/platform/business-circles`, { headers })).json())
      .data;
    const circle = data.circles.find((item) => item.code.startsWith('browser-circle-'));
    const merchant = circle.merchants[0];
    const approved = await fetch(
      `${api}/api/v1/platform/business-circles/${circle.id}/merchants/${merchant.tenantId}/approve`,
      {
        method: 'POST',
        headers: { ...headers, 'idempotency-key': crypto.randomUUID() },
        body: JSON.stringify({ version: merchant.version }),
      },
    );
    expect(approved.status).toBe(201);
  }
});

test('channel operator sees approved fixed-circle operating projections', async ({ page }) => {
  await page.addInitScript((value) => {
    sessionStorage.setItem('oneday.accessToken', value.accessToken);
    sessionStorage.setItem('oneday.refreshToken', value.refreshToken);
    sessionStorage.setItem('oneday.accessExpiresAt', value.expiresAt);
  }, session);
  await page.goto('/bc/dashboard');
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.getByLabel('Business-circle metrics')).toBeVisible();
  await page.screenshot({
    path: 'evidence/CIRCLE-001/business-circle-dashboard-desktop-v2.png',
    fullPage: false,
  });
});

test('business-circle dashboard rejects a missing session', async ({ page }) => {
  await page.goto('/bc/dashboard');
  await expect(page.locator('h1')).toBeVisible();
  await page.screenshot({
    path: 'evidence/CIRCLE-001/business-circle-dashboard-forbidden-v2.png',
    fullPage: true,
  });
});
