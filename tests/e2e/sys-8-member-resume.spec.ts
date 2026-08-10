import { expect, test } from '@playwright/test';

const api = 'http://127.0.0.1:3293';
const consumer = 'http://localhost:3294';
const system = '00000000-0000-4000-8000-000000000001';

test('cross-device resume restores member proof on 我的 without prior session', async ({
  page,
  context,
}) => {
  const stamp = `${Date.now()}`;
  const slug = `sys8-resume-ui-${stamp}`;
  const phone = `136${stamp.slice(-8)}`;
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
      organizationName: 'Resume UI HQ',
      merchantName: 'Resume UI Merchant',
      storeName: 'Resume UI Store',
      address: 'UI Resume Road 1',
      phone: '021-9000',
      businessHours: '09:00-21:00',
      adminName: 'Owner',
      adminEmail: `${slug}@example.test`,
      adminPassword: 'Resume-ui-Password!',
      industry: 'retail',
      plan: 'starter',
    }),
  });
  expect(provision.status).toBe(201);
  const run = (await provision.json()).data;
  const storeId = run.steps.find((step: { code: string }) => step.code === 'organization_store')
    .output.storeId;

  const enroll = await fetch(
    `${api}/api/v1/consumer/memberships/enroll?tenant=${encodeURIComponent(slug)}`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': crypto.randomUUID(),
      },
      body: JSON.stringify({ storeId, phone, consent: true }),
    },
  );
  expect(enroll.status).toBe(201);
  const member = (await enroll.json()).data as { memberCode: string };

  await context.clearCookies();
  await page.goto(`${consumer}/c/stores/${storeId}/profile?tenant=${slug}`);
  await expect(page.getByRole('heading', { name: '尚未完成本店入会' })).toBeVisible();
  await expect(page.getByTestId('member-resume-card')).toBeVisible();
  await expect(page.getByTestId('member-proof')).toHaveCount(0);
  await page.screenshot({
    path: 'evidence/SYS-8/member-resume-anonymous.png',
    fullPage: true,
  });

  await page.getByLabel('恢复会员手机号').fill(phone);
  await page.getByLabel('恢复会员码').fill(member.memberCode);
  await page.getByLabel('同意恢复会员隐私授权').check();
  await page.getByTestId('member-resume-submit').click();
  await expect(page.getByTestId('member-proof')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('member-proof')).toContainText(member.memberCode);
  await page.screenshot({
    path: 'evidence/SYS-8/member-resume-ready.png',
    fullPage: true,
  });
});
