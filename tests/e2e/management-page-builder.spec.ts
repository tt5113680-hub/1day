import { expect, test } from '@playwright/test';
const api = 'http://127.0.0.1:3113',
  tenant = '00000000-0000-4000-8000-000000000001';
let token = '';
let refreshToken = '';
let templateCode = '';
let commercialToken = '';
let commercialRefreshToken = '';
let commercialTemplateName = '';
test.beforeAll(async () => {
  const r = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@system.local',
      password: 'ChangeMe123!',
      tenantId: tenant,
    }),
  });
  expect(r.status).toBe(201);
  ({ accessToken: token, refreshToken } = await r.json());
  templateCode = `builder_${Date.now()}`;
  const c = await fetch(`${api}/api/v1/page-templates`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'x-request-id': crypto.randomUUID(),
      'idempotency-key': crypto.randomUUID(),
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      code: templateCode,
      name: 'Builder acceptance',
      target: 'consumer',
      modules: [
        { moduleType: 'hero', config: {} },
        { moduleType: 'content', config: {} },
      ],
    }),
  });
  expect(c.status).toBe(201);
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const ownerEmail = `builder-owner-${suffix}@example.test`;
  const ownerPassword = `Builder-${suffix}-Password!`;
  commercialTemplateName = `Builder Store ${suffix}`;
  const provision = await fetch(`${api}/api/v1/platform/onboarding`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'x-request-id': crypto.randomUUID(),
      'idempotency-key': crypto.randomUUID(),
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      slug: `builder-${suffix}`,
      tenantName: `Builder ${suffix}`,
      organizationName: 'Builder HQ',
      merchantName: 'Builder Merchant',
      storeName: commercialTemplateName,
      address: '66 Builder Road',
      phone: '021-55556666',
      businessHours: '09:00-21:00',
      adminName: 'Builder Owner',
      adminEmail: ownerEmail,
      adminPassword: ownerPassword,
      industry: 'retail',
      plan: 'starter',
    }),
  });
  expect(provision.status).toBe(201);
  const ready = (await provision.json()).data;
  const ownerLogin = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: ownerEmail,
      password: ownerPassword,
      tenantId: ready.tenantId,
    }),
  });
  expect(ownerLogin.status).toBe(201);
  ({ accessToken: commercialToken, refreshToken: commercialRefreshToken } =
    await ownerLogin.json());
});
test('manager previews fixed modules at desktop width', async ({ page }) => {
  await page.addInitScript(
    ([access, refresh]) => {
      sessionStorage.setItem('oneday.accessToken', access);
      sessionStorage.setItem('oneday.refreshToken', refresh);
      sessionStorage.setItem('oneday.accessExpiresAt', String(Date.now() + 15 * 60 * 1000));
    },
    [token, refreshToken],
  );
  await page.goto('/m/page-builder');
  await expect(
    page.getByRole('heading', { name: '在固定业务模块内维护模板、预览与版本' }),
  ).toBeVisible();
  const template = page.getByRole('article').filter({ hasText: templateCode });
  await expect(template).toBeVisible();
  await template.getByRole('button', { name: '进入装修' }).click();
  await expect(page.getByRole('heading', { name: '装修与同渲染器预览' })).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-M-014/management-page-builder-desktop-v3.png',
    fullPage: false,
  });
});
test('page builder recovers without a session', async ({ page }) => {
  await page.goto('/m/page-builder');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading')).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-M-014/management-page-builder-forbidden.png',
    fullPage: true,
  });
});

test('merchant creates a draft, previews, publishes and rolls back the bound Storefront', async ({
  page,
}) => {
  await page.addInitScript(
    ([access, refresh]) => {
      sessionStorage.setItem('oneday.accessToken', access);
      sessionStorage.setItem('oneday.refreshToken', refresh);
      sessionStorage.setItem('oneday.accessExpiresAt', String(Date.now() + 15 * 60 * 1000));
    },
    [commercialToken, commercialRefreshToken],
  );
  await page.goto('/m/page-builder');
  const template = page.getByRole('article').filter({ hasText: commercialTemplateName });
  await expect(template).toBeVisible();
  await template.getByRole('button', { name: '进入装修' }).click();
  await expect(page.getByText(`已绑定 ${commercialTemplateName}`)).toBeVisible();
  await page.getByRole('button', { name: '创建装修草稿' }).click();
  await expect(page.getByRole('status')).toContainText('消费者仍读取已发布版本');
  await page.getByRole('button', { name: '隐藏' }).first().click();
  await page.getByRole('button', { name: '保存草稿' }).click();
  await expect(page.getByRole('status')).toContainText('草稿已保存');
  await page.getByRole('button', { name: '生成手机/PC 预览' }).click();
  const previewLink = page.getByRole('link', { name: '在消费者渲染器打开安全预览' });
  await expect(previewLink).toBeVisible();
  const previewPagePromise = page.context().waitForEvent('page');
  await previewLink.click();
  const previewPage = await previewPagePromise;
  await expect(previewPage.getByRole('status')).toContainText('装修预览');
  await expect(previewPage.getByText(commercialTemplateName).first()).toBeVisible();
  await previewPage.screenshot({
    path: 'evidence/PAGE-M-014/consumer-storefront-preview-v3.png',
    fullPage: false,
  });
  await previewPage.close();
  await page.getByRole('button', { name: '发布当前草稿' }).click();
  await expect(page.getByRole('status')).toContainText('Consumer 已读取新版本');
  await expect(page.getByRole('heading', { name: '发布历史' })).toBeVisible();
  await page.getByRole('button', { name: '回滚到 V1' }).click();
  await expect(page.getByRole('status')).toContainText('已回滚并生成新的发布记录');
  await page.screenshot({
    path: 'evidence/PAGE-M-014/management-storefront-lifecycle-v4.png',
    fullPage: false,
  });
});
