import { expect, test } from '@playwright/test';
const api = 'http://127.0.0.1:3231',
  system = '00000000-0000-4000-8000-000000000001';
let owner = '',
  refresh = '',
  slug = '',
  storeId = '',
  benefitId = '',
  memberCode = '';
const h = (token: string, tenant: string, more = {}) => ({
  authorization: `Bearer ${token}`,
  'x-tenant-context': tenant,
  'x-request-id': crypto.randomUUID(),
  'content-type': 'application/json',
  ...more,
});
test.beforeAll(async () => {
  const s = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@system.local',
      password: 'ChangeMe123!',
      tenantId: system,
    }),
  });
  const st = (await s.json()).accessToken,
    x = `member-ui-${Date.now()}`;
  slug = x;
  const p = await fetch(`${api}/api/v1/platform/onboarding`, {
    method: 'POST',
    headers: h(st, system, { 'idempotency-key': crypto.randomUUID() }),
    body: JSON.stringify({
      slug: x,
      tenantName: x,
      organizationName: '会员总部',
      merchantName: '会员商户',
      storeName: '会员门店',
      address: '测试路 1 号',
      phone: '021-5555',
      businessHours: '09:00-21:00',
      adminName: '会员员工',
      adminEmail: `${x}@example.test`,
      adminPassword: 'Member-ui-Password!',
      industry: 'retail',
      plan: 'starter',
    }),
  });
  const run = (await p.json()).data;
  storeId = run.steps.find((z: { code: string }) => z.code === 'organization_store').output.storeId;
  const l = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: `${x}@example.test`,
      password: 'Member-ui-Password!',
      tenantId: run.tenantId,
    }),
  });
  ({ accessToken: owner, refreshToken: refresh } = await l.json());
  const benefits = await fetch(`${api}/api/v1/management/memberships`, {
    headers: h(owner, run.tenantId),
  });
  benefitId = (await benefits.json()).data.benefits[0].id;
  (globalThis as any).tenantId = run.tenantId;
});
const session = (page: any) =>
  page.addInitScript(
    ([a, r]: string[]) => {
      sessionStorage.setItem('oneday.accessToken', a);
      sessionStorage.setItem('oneday.refreshToken', r);
      sessionStorage.setItem('oneday.accessExpiresAt', String(Date.now() + 900000));
    },
    [owner, refresh],
  );
test('consumer enrolls, management grants and employee redeems', async ({ browser }) => {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 } }),
    cp = await c.newPage();
  await cp.goto(`http://localhost:3232/c/stores/${storeId}/membership?tenant=${slug}`);
  await cp.getByLabel('入会手机号').fill('13800138000');
  await cp.getByLabel('同意会员隐私授权').check();
  await cp.getByRole('button', { name: '确认加入会员' }).click();
  const status = cp.getByRole('status');
  await expect(status).toContainText('入会成功');
  memberCode = ((await status.textContent()) ?? '').match(/[A-F0-9]{12}/)?.[0] ?? '';
  await cp.screenshot({
    path: 'evidence/BATCH-2-MEMBERSHIP/consumer-enrollment-mobile.png',
    fullPage: true,
  });
  const tenant = (globalThis as any).tenantId;
  const list = await fetch(`${api}/api/v1/management/memberships`, { headers: h(owner, tenant) });
  const e = (await list.json()).data.enrollments[0];
  await fetch(`${api}/api/v1/management/memberships/${e.id}/grants`, {
    method: 'POST',
    headers: h(owner, tenant, { 'idempotency-key': crypto.randomUUID() }),
    body: JSON.stringify({ benefitId, quantity: 1 }),
  });
  const ec = await browser.newContext({ viewport: { width: 390, height: 844 } }),
    ep = await ec.newPage();
  await session(ep);
  await ep.goto('http://localhost:3234/e/workbench');
  await ep.getByLabel('会员码').fill(memberCode);
  await ep.getByLabel('核销权益').selectOption(benefitId);
  await ep.getByRole('button', { name: '确认核销' }).click();
  await expect(ep.getByRole('status')).toContainText('会员权益已核销');
  await ep.screenshot({
    path: 'evidence/BATCH-2-MEMBERSHIP/employee-redemption-mobile.png',
    fullPage: true,
  });
});
