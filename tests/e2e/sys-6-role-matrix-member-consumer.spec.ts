import { expect, test } from '@playwright/test';

const api = 'http://127.0.0.1:3281';
const consumer = 'http://localhost:3282';
const system = '00000000-0000-4000-8000-000000000001';

test('anonymous profile denies private data; enroll proves membership on 我的', async ({
  page,
}) => {
  const stamp = `${Date.now()}`;
  const slug = `sys6-member-ui-${stamp}`;
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
  const platformToken = (await login.json()).accessToken;
  const provision = await fetch(`${api}/api/v1/platform/onboarding`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${platformToken}`,
      'x-request-id': crypto.randomUUID(),
      'idempotency-key': crypto.randomUUID(),
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      slug,
      tenantName: slug,
      organizationName: 'Member UI HQ',
      merchantName: 'Member UI Merchant',
      storeName: 'Member UI Store',
      address: 'UI Road 1',
      phone: '021-7000',
      businessHours: '09:00-21:00',
      adminName: 'Owner',
      adminEmail: `${slug}@example.test`,
      adminPassword: 'Member-ui-Password!',
      industry: 'retail',
      plan: 'starter',
    }),
  });
  expect(provision.status).toBe(201);
  const run = (await provision.json()).data;
  const storeId = run.steps.find((step: { code: string }) => step.code === 'organization_store')
    .output.storeId;

  await page.goto(`${consumer}/c/stores/${storeId}/profile?tenant=${slug}`);
  await expect(page.getByRole('heading', { name: '我的服务', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '尚未完成本店入会' })).toBeVisible();
  await expect(page.getByTestId('member-enroll-cta')).toBeVisible();
  await expect(page.getByTestId('member-proof')).toHaveCount(0);
  await page.screenshot({
    path: 'evidence/SYS-6/member-profile-anonymous.png',
    fullPage: true,
  });

  await page.goto(`${consumer}/c/stores/${storeId}/membership?tenant=${slug}`);
  await page.getByLabel('入会手机号').fill(`139${stamp.slice(-8)}`);
  await page.getByLabel('同意会员隐私授权').check();
  await page.getByRole('button', { name: '确认加入会员' }).click();
  await expect(page.getByRole('status')).toContainText('入会成功');
  await page.getByRole('link', { name: /查看会员证明/ }).click();
  await expect(page.getByTestId('member-proof')).toBeVisible();
  await expect(page.getByTestId('member-proof')).toContainText('会员码');
  await expect(page.getByTestId('member-privacy-link')).toBeVisible();
  await page.screenshot({
    path: 'evidence/SYS-6/member-profile-ready.png',
    fullPage: true,
  });
});
