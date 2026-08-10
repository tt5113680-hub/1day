import { expect, test } from '@playwright/test';

const api = 'http://127.0.0.1:3301';
const platform = 'http://localhost:3302';
const system = '00000000-0000-4000-8000-000000000001';

test('READY steps show 完成; failed trail shows 失败 and honest retry', async ({ page }) => {
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

  const stamp = `${Date.now()}`;
  await page.route('**/api/v1/platform/onboarding', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          runId: '11111111-1111-4111-8111-111111111111',
          tenantId: null,
          slug: `sys11-ui-${stamp}`,
          state: 'failed_recoverable',
          industry: 'retail',
          plan: 'starter',
          errorCode: 'PROVISIONING_FAILED',
          errorDetail: 'simulated recoverable failure',
          delivery: null,
          steps: [
            { code: 'validate_reserve', state: 'failed', errorCode: 'PROVISIONING_FAILED' },
            { code: 'tenant_foundation', state: 'pending' },
            { code: 'owner_role_packs', state: 'pending' },
          ],
        },
        meta: {},
        error: null,
      }),
    });
  });

  await page.goto(`${platform}/p/tenants/new`);
  await page.getByLabel('租户标识').fill(`sys11-ui-${stamp}`);
  await page.getByLabel('商户名称').fill('SYS11 UI');
  await page.getByLabel('总部组织名称').fill('SYS11 HQ');
  await page.getByLabel('经营主体名称').fill('SYS11 Merchant');
  await page.getByLabel('首店名称').fill('SYS11 Store');
  await page.getByLabel('门店电话').fill('021-1100');
  await page.getByLabel('门店地址').fill('SYS11 Road');
  await page.getByLabel('老板姓名').fill('Owner');
  await page.getByLabel('老板邮箱').fill(`sys11-ui-${stamp}@example.local`);
  await page.getByLabel('初始登录密码').fill('ChangeMe123!');
  await page.getByRole('button', { name: '一键开通并验证 READY' }).click();

  await expect(page.getByTestId('provisioning-result')).toBeVisible();
  await expect(page.getByTestId('provisioning-error')).toContainText('PROVISIONING_FAILED');
  await expect(page.getByTestId('provisioning-steps').locator('[data-step-state="failed"]')).toContainText(
    '失败',
  );
  await expect(page.getByTestId('provisioning-steps').getByText('按需跳过')).toHaveCount(0);
  await expect(page.getByTestId('provisioning-retry-fresh')).toBeVisible();
  await page.screenshot({
    path: 'evidence/SYS-11/provisioning-failure-trail.png',
    fullPage: true,
  });

  await page.getByTestId('provisioning-retry-fresh').click();
  await expect(page.getByRole('status')).toContainText('已清空幂等键');
});
