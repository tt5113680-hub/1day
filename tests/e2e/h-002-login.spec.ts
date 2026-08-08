import { expect, test } from '@playwright/test';
import {
  cleanupCommercialSimulation,
  commercialSimulation,
  seedCommercialSimulation,
  verifyCommercialSimulation,
} from '../fixtures/commercial-simulation.mjs';

process.env.NODE_ENV = 'test';
const api = 'http://127.0.0.1:3170';
const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const terminals = [
  {
    login: 'http://127.0.0.1:3172/e/login',
    target: 'http://127.0.0.1:3172/e/workbench',
    role: 'employee01',
    tenant: 'luckin',
  },
  {
    login: 'http://127.0.0.1:3173/login',
    target: 'http://127.0.0.1:3173/m/dashboard',
    role: 'owner',
    tenant: 'luckin',
  },
  {
    login: 'http://127.0.0.1:3174/login',
    target: 'http://127.0.0.1:3174/p/dashboard',
    role: 'platform',
    tenant: 'system',
  },
] as const;

test.beforeAll(async () => {
  await seedCommercialSimulation(databaseUrl);
});
test.afterAll(async () => {
  await cleanupCommercialSimulation(databaseUrl);
});

test('PostgreSQL fixture carries the isolated commercial simulation graph', async () => {
  await expect(verifyCommercialSimulation(databaseUrl)).resolves.toEqual([
    3, 5, 2, 2, 1, 1, 1, 1, 1, 1, 1,
  ]);
});

for (const terminal of terminals) {
  test(`真人 ${terminal.role} 登录、刷新和登出：${terminal.login}`, async ({ page, request }) => {
    await page.goto(terminal.login);
    await page
      .getByPlaceholder('租户标识')
      .fill(commercialSimulation.tenants[terminal.tenant].slug);
    await page.getByPlaceholder('邮箱').fill(commercialSimulation.accounts[terminal.role]);
    await page.getByPlaceholder('密码').fill(commercialSimulation.password);
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForURL(terminal.target);
    const oldToken = await page.evaluate(() => sessionStorage.getItem('oneday.accessToken'));
    expect(oldToken).toBeTruthy();
    await page.evaluate(() => sessionStorage.setItem('oneday.accessExpiresAt', '0'));
    await page.reload();
    await expect(page.getByRole('button', { name: '退出登录' })).toBeVisible();
    await page.getByRole('button', { name: '退出登录' }).click();
    await expect(page).toHaveURL(terminal.login);
    expect(
      (
        await request.get(`${api}/api/v1/auth/context`, {
          headers: { authorization: `Bearer ${oldToken}` },
        })
      ).status(),
    ).toBe(401);
  });
}

test('消费者保持公开匿名访问，不出现后台登录墙', async ({ page }) => {
  await page.goto('http://127.0.0.1:3171/c/entry?tenant=luckin-oneday-test');
  await expect(page).not.toHaveURL(/\/c\/login/);
});

test('渠道、商圈、跨租户和低权限访问均受真实会话与 RBAC 隔离', async ({ request }) => {
  const login = async (
    role: keyof typeof commercialSimulation.accounts,
    tenant: keyof typeof commercialSimulation.tenants,
  ) => {
    const response = await request.post(`${api}/api/v1/auth/login`, {
      data: {
        email: commercialSimulation.accounts[role],
        password: commercialSimulation.password,
        tenantSlug: commercialSimulation.tenants[tenant].slug,
        deviceName: 'h-002-http',
      },
    });
    expect(response.status()).toBe(201);
    return (await response.json()) as { accessToken: string; refreshToken: string };
  };
  const channel = await login('channel', 'system');
  const circle = await login('circle', 'system');
  const employee = await login('employee01', 'luckin');
  const restaurantB = await login('restaurantB', 'restaurantB');
  for (const session of [channel, circle])
    expect(
      (
        await request.get(`${api}/api/v1/platform/dashboard`, {
          headers: {
            authorization: `Bearer ${session.accessToken}`,
            'x-request-id': crypto.randomUUID(),
          },
        })
      ).status(),
    ).toBe(200);
  expect(
    (
      await request.get(`${api}/api/v1/auth/permissions/tenant.manage`, {
        headers: { authorization: `Bearer ${employee.accessToken}` },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.get(`${api}/api/v1/auth/context`, {
        headers: {
          authorization: `Bearer ${employee.accessToken}`,
          'x-tenant-context': commercialSimulation.tenants.restaurantB.id,
        },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.get(`${api}/api/v1/management/dashboard`, {
        headers: {
          authorization: `Bearer ${restaurantB.accessToken}`,
          'x-request-id': crypto.randomUUID(),
        },
      })
    ).status(),
  ).toBe(200);
  const refreshed = await request.post(`${api}/api/v1/auth/refresh`, {
    data: { refreshToken: employee.refreshToken },
  });
  expect(refreshed.status()).toBe(201);
  expect(
    (
      await request.post(`${api}/api/v1/auth/refresh`, {
        data: { refreshToken: employee.refreshToken },
      })
    ).status(),
  ).toBe(401);
});
