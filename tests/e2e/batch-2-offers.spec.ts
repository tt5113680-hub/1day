import { expect, test } from '@playwright/test';

const api = 'http://127.0.0.1:3227';
const systemTenant = '00000000-0000-4000-8000-000000000001';
let accessToken = '';
let refreshToken = '';
let consumerStorePath = '';
let packageName = '';

test.beforeAll(async () => {
  const systemLogin = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@system.local',
      password: 'ChangeMe123!',
      tenantId: systemTenant,
    }),
  });
  expect(systemLogin.status).toBe(201);
  const systemToken = (await systemLogin.json()).accessToken as string;
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const slug = `offer-ui-${suffix}`;
  const ownerEmail = `${slug}@example.test`;
  const ownerPassword = `Offer-ui-${suffix}-Password!`;
  packageName = `双人夏日套餐 ${suffix.slice(-4)}`;
  const provision = await fetch(`${api}/api/v1/platform/onboarding`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${systemToken}`,
      'x-tenant-context': systemTenant,
      'x-request-id': crypto.randomUUID(),
      'idempotency-key': crypto.randomUUID(),
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      slug,
      tenantName: `Offer UI ${suffix}`,
      organizationName: 'Offer UI 总部',
      merchantName: 'Offer UI 商户',
      storeName: '夏日餐厅',
      address: '上海市测试路 50 号',
      phone: '021-55555000',
      businessHours: '09:00-21:00',
      adminName: '套餐运营负责人',
      adminEmail: ownerEmail,
      adminPassword: ownerPassword,
      industry: 'restaurant',
      plan: 'starter',
    }),
  });
  expect(provision.status).toBe(201);
  const ready = (await provision.json()).data;
  const storeId = ready.steps.find((step: { code: string }) => step.code === 'organization_store')
    .output.storeId as string;
  consumerStorePath = `/c/stores/${storeId}?tenant=${encodeURIComponent(slug)}`;
  const ownerLogin = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: ownerEmail, password: ownerPassword, tenantId: ready.tenantId }),
  });
  expect(ownerLogin.status).toBe(201);
  ({ accessToken, refreshToken } = await ownerLogin.json());
  const link = await fetch(`${api}/api/v1/management/stores/${storeId}/external-links`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'x-tenant-context': ready.tenantId,
      'x-request-id': crypto.randomUUID(),
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      title: '美团门店套餐',
      description: '前往平台核对最终价格与库存',
      targetUrl: 'https://example.test/merchant-offer',
      platformType: 'meituan',
      enabled: true,
      sortOrder: 1,
    }),
  });
  expect(link.status).toBe(201);
});

test('merchant creates a truthful Offer and Consumer reads the same source', async ({
  page,
  browser,
}) => {
  await page.addInitScript(
    ([access, refresh]) => {
      sessionStorage.setItem('oneday.accessToken', access);
      sessionStorage.setItem('oneday.refreshToken', refresh);
      sessionStorage.setItem('oneday.accessExpiresAt', String(Date.now() + 15 * 60 * 1000));
    },
    [accessToken, refreshToken],
  );
  await page.goto('/m/offers');
  await expect(
    page.getByRole('heading', { name: '维护服务真源，再关联受控平台价格入口' }),
  ).toBeVisible();
  await page.getByLabel('套餐编码').fill(`summer-${Date.now()}`);
  await page.getByLabel('套餐名称').fill(packageName);
  await page.getByLabel('价格说明').fill('门店价以到店确认为准');
  await page.getByLabel('套餐说明').fill('双人主食、小食与饮品组合');
  await page.getByRole('button', { name: '创建套餐' }).click();
  await expect(page.getByText('服务/套餐已创建，Consumer 目录刷新后可见。')).toBeVisible();
  await expect(page.getByRole('heading', { name: packageName })).toBeVisible();
  await page.getByLabel(`${packageName} 平台入口`).selectOption({ index: 1 });
  await page.getByLabel(`${packageName} Offer 价`).fill('99');
  await page.getByLabel(`${packageName} 参考原价`).fill('129');
  await page.getByRole('button', { name: '新增 Offer' }).first().click();
  await expect(
    page.getByText('Offer 已关联到受控 HTTPS 入口；Consumer 会显示来源与更新时间。'),
  ).toBeVisible();
  await expect(page.getByText('¥99.00')).toBeVisible();
  await expect(page.getByText(/商户经营后台登记/)).toBeVisible();
  await page.screenshot({
    path: 'evidence/BATCH-2-OFFERS/management-offers-desktop.png',
    fullPage: true,
  });

  const consumerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const consumer = await consumerContext.newPage();
  await consumer.goto(`http://localhost:3229${consumerStorePath}`);
  const platformComparison = consumer.locator('#platforms');
  await expect(platformComparison.getByText(packageName)).toBeVisible();
  await expect(platformComparison.getByText(/团购价.*99/)).toBeVisible();
  await expect(platformComparison.getByText(/商家登记于/)).toBeVisible();
  await consumer.screenshot({
    path: 'evidence/BATCH-2-OFFERS/consumer-offer-mobile.png',
    fullPage: true,
  });
  await consumerContext.close();
});

test('Offer operations require a Management session', async ({ page }) => {
  await page.goto('/m/offers');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { name: '管理端登录' })).toBeVisible();
  await page.screenshot({
    path: 'evidence/BATCH-2-OFFERS/management-offers-permission.png',
    fullPage: true,
  });
});
