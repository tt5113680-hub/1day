import { expect, test } from '@playwright/test';
import {
  cleanupCommercialSimulation,
  commercialSimulation,
  seedCommercialSimulation,
} from '../fixtures/commercial-simulation.mjs';

process.env.NODE_ENV = 'test';

const api = 'http://127.0.0.1:3243';
const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const tenant = commercialSimulation.tenants.luckin;
let session = { accessToken: '', refreshToken: '', expiresAt: '' };

test.beforeAll(async () => {
  await seedCommercialSimulation(databaseUrl);
  const response = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: commercialSimulation.accounts.owner,
      password: commercialSimulation.password,
      tenantSlug: tenant.slug,
      deviceName: 'batch-3-content-sync',
    }),
  });
  expect(response.status).toBe(201);
  session = await response.json();
});
test.afterAll(async () => {
  await cleanupCommercialSimulation(databaseUrl);
});

test('management approval and placement reach the consumer store without a separate content source', async ({
  page,
}) => {
  const title = `Batch 3 managed placement ${Date.now()}`;
  await page.addInitScript((value) => {
    sessionStorage.setItem('oneday.accessToken', value.accessToken);
    sessionStorage.setItem('oneday.refreshToken', value.refreshToken);
    sessionStorage.setItem('oneday.accessExpiresAt', String(value.expiresAt));
  }, session);
  await page.goto('/m/content');
  await page.getByLabel('文章标题').fill(title);
  await page.getByRole('button', { name: '创建草稿' }).click();
  const card = page.locator('article').filter({ hasText: title });
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: '审批并允许投放' }).click();
  await expect(card.getByRole('button', { name: '投放到消费者门店' })).toBeVisible();
  await card.getByLabel(`${title} 展示门店`).selectOption({ index: 1 });
  await card.getByLabel(`${title} 展示排序`).fill('99');
  await card.getByRole('button', { name: '投放到消费者门店' }).click();
  await expect(page.getByRole('status')).toContainText('消费者门店内容已更新');
  await page.screenshot({
    path: 'evidence/BATCH-3-CONTENT-SYNC/management-placement.png',
    fullPage: false,
  });

  await page.goto(
    `http://localhost:3245/c/stores/20000000-0000-4000-8000-000000000200?tenant=${tenant.slug}`,
  );
  await expect(page.getByText(title)).toBeVisible();
  await page.screenshot({
    path: 'evidence/BATCH-3-CONTENT-SYNC/consumer-placement.png',
    fullPage: true,
  });
});

test('consumer discovery exposes only the platform relations approved for the merchant', async ({
  page,
}) => {
  const storePath = `/c/stores/20000000-0000-4000-8000-000000000200?tenant=${tenant.slug}`;
  await page.goto(`http://localhost:3245/c/discovery?tenant=${tenant.slug}`);
  await expect(page.locator(`a[href="${storePath}"]`).first()).toBeVisible();
  await expect(page.locator(`a[href="${storePath}"]`)).toHaveCount(2);
  await page.screenshot({
    path: 'evidence/BATCH-3-CONTENT-SYNC/consumer-network-discovery.png',
    fullPage: true,
  });
});
