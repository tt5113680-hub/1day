import { expect, test } from '@playwright/test';

const api = 'http://127.0.0.1:3127';
const systemTenant = '00000000-0000-4000-8000-000000000001';
let token = '';
let refreshToken = '';

test.beforeAll(async () => {
  const response = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@system.local',
      password: 'ChangeMe123!',
      tenantId: systemTenant,
    }),
  });
  expect(response.status).toBe(201);
  ({ accessToken: token, refreshToken } = (await response.json()) as {
    accessToken: string;
    refreshToken: string;
  });
});

test('platform admin completes the tenant onboarding wizard', async ({ page }) => {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const slug = `browser-${suffix}`;
  await page.addInitScript(
    ({ accessToken, refresh }) => {
      sessionStorage.setItem('oneday.accessToken', accessToken);
      sessionStorage.setItem('oneday.refreshToken', refresh);
      sessionStorage.setItem('oneday.accessExpiresAt', String(Date.now() + 30 * 60 * 1000));
    },
    { accessToken: token, refresh: refreshToken },
  );
  await page.goto('/p/tenants/new');
  await expect(page.getByRole('heading', { name: /生成可登录、可访问的 READY 商户/ })).toBeVisible();
  await page.getByLabel('租户标识').fill(slug);
  await page.getByLabel('商户名称').fill(`Browser ${suffix}`);
  await page.getByLabel('总部组织名称').fill('Browser HQ');
  await page.getByLabel('经营主体名称').fill('Browser Merchant');
  await page.getByLabel('首店名称').fill('Browser Main');
  await page.getByLabel('门店电话').fill('021-55550000');
  await page.getByLabel('门店地址').fill('88 Browser Road');
  await page.getByLabel('营业时间').fill('09:00-21:00');
  await page.getByLabel('老板姓名').fill('Browser Owner');
  await page.getByLabel('老板邮箱').fill(`browser-owner-${suffix}@example.test`);
  await page.getByLabel('初始登录密码').fill(`Browser-${suffix}-Password!`);
  await page.getByLabel('行业模板').selectOption('beauty');
  await page.getByRole('button', { name: '一键开通并验证 READY' }).click();
  await expect(page.getByRole('status')).toContainText(`${slug} 已完成机器验证并进入 READY`);
  await expect(page.getByText('生成 READY 交付包')).toBeVisible();
  await expect(page.getByText('ONE-CODE', { exact: true })).toBeVisible();
  await page.getByRole('status').scrollIntoViewIfNeeded();
  await page.screenshot({
    path: 'evidence/PAGE-P-003/platform-onboarding-ready-v2.png',
    fullPage: false,
  });
});

test('onboarding page redirects to secure sign-in without a session', async ({ page }) => {
  await page.goto('/p/tenants/new');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading')).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-P-003/platform-onboarding-forbidden.png',
    fullPage: true,
  });
});
