import { expect, test } from '@playwright/test';

const consumer = 'http://127.0.0.1:3201';
const tenant = 'luckin-oneday-human-pilot';
const stores = [
  ['30000000-0000-4000-8000-000000000021', '北京国贸测试店', '生椰拿铁双杯'],
  ['30000000-0000-4000-8000-000000000022', '北京望京测试店', '望京晚间轻咖套餐'],
  ['30000000-0000-4000-8000-000000000023', '北京中关村测试店', '中关村手冲体验'],
] as const;

const url = (storeId: string) =>
  `${consumer}/c/stores/${storeId}?tenant=${tenant}&source=consumer:commercial-home`;

test('CONSUMER-COMMERCIAL-HOME-V1: three real test storefronts render distinct commercial data', async ({
  browser,
}) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  for (const [storeId, storeName, offer] of stores) {
    await page.goto(url(storeId), { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: storeName })).toBeAttached();
    await expect(page.locator('a[href*="/c/services/"]').filter({ hasText: offer })).toBeVisible();
    await expect(page.getByText('全平台团购比价', { exact: true })).toBeVisible();
    await expect(page.locator('nav[aria-label="消费者主导航"] a')).toHaveCount(5);
    await expect(page.getByRole('button', { name: /到店咨询/ })).toBeVisible();
  }
  await page.goto(url(stores[0][0]), { waitUntil: 'networkidle' });
  await expect(page.getByText(/团购价\s*¥19.90/)).toBeVisible();
  await expect(page.getByText(/团购价\s*¥21.90/)).toBeVisible();
  await expect(page.getByText('当前低价', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /北京国贸测试店/ }).click();
  await expect(page.getByRole('dialog', { name: '选择门店' })).toBeVisible();
  await expect(page.getByRole('link', { name: /北京望京测试店/ })).toBeVisible();
  await page.getByRole('link', { name: /北京望京测试店/ }).click();
  await expect(page).toHaveURL(/000000000022/);
});

test('CONSUMER-COMMERCIAL-HOME-V1: storefront is clear at target mobile widths', async ({
  browser,
}) => {
  for (const width of [375, 390, 430]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    await page.goto(url(stores[0][0]), { waitUntil: 'networkidle' });
    await expect(page.getByText('今日推荐', { exact: true })).toBeVisible();
    await expect(page.getByText('商圈权益', { exact: true })).toBeVisible();
    await expect(page.locator('body')).not.toHaveJSProperty('scrollWidth', width + 1);
    await page.screenshot({
      path: `evidence/CONSUMER-COMMERCIAL-HOME-V1/storefront-${width}.png`,
      fullPage: true,
    });
    await page.close();
  }
});
