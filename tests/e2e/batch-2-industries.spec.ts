import { expect, test } from '@playwright/test';
const api = 'http://127.0.0.1:3236',
  system = '00000000-0000-4000-8000-000000000001';
const h = (token: string, tenant: string) => ({
  authorization: `Bearer ${token}`,
  'x-tenant-context': tenant,
  'x-request-id': crypto.randomUUID(),
  'idempotency-key': crypto.randomUUID(),
  'content-type': 'application/json',
});
const fixtures: { industry: string; storeId: string; slug: string }[] = [];
test.beforeAll(async () => {
  const login = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@system.local',
      password: 'ChangeMe123!',
      tenantId: system,
    }),
  });
  const token = (await login.json()).accessToken;
  for (const industry of ['restaurant', 'beauty', 'education', 'retail']) {
    const slug = `industry-${industry}-${Date.now()}`;
    const p = await fetch(`${api}/api/v1/platform/onboarding`, {
      method: 'POST',
      headers: h(token, system),
      body: JSON.stringify({
        slug,
        tenantName: `${industry} tenant`,
        organizationName: '模板总部',
        merchantName: '模板商户',
        storeName: `${industry} 门店`,
        address: '模板路 1 号',
        phone: '021-5555',
        businessHours: '09:00-21:00',
        adminName: '模板负责人',
        adminEmail: `${slug}@example.test`,
        adminPassword: 'Template-Password!',
        industry,
        plan: 'starter',
      }),
    });
    expect(p.status).toBe(201);
    const run = (await p.json()).data;
    fixtures.push({
      industry,
      slug,
      storeId: run.steps.find((s: { code: string }) => s.code === 'organization_store').output
        .storeId,
    });
  }
});
test('four industry storefront families are responsive at four product breakpoints', async ({
  page,
}) => {
  for (const item of fixtures) {
    for (const width of [390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`http://localhost:3237/c/stores/${item.storeId}?tenant=${item.slug}`);
      await expect(page.locator('[data-industry]')).toHaveAttribute('data-industry', item.industry);
      await expect(
        page.getByRole('heading', { name: item.storeId ? `${item.industry} 门店` : '' }),
      ).toBeVisible();
      await page.screenshot({
        path: `evidence/BATCH-2-INDUSTRIES/${item.industry}-${width}.png`,
        fullPage: false,
      });
    }
  }
});
