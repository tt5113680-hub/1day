import { expect, test, type Page } from '@playwright/test';

const signIn = async (page: Page) => {
  await page.goto('/login');
  await page.getByPlaceholder('租户标识').fill('system');
  await page.getByPlaceholder('邮箱').fill('admin@system.local');
  await page.getByPlaceholder('密码').fill('ChangeMe123!');
  await page.getByRole('button', { name: '登录' }).click();
  await page.waitForURL('/p/dashboard');
};
test('platform admin views global operational signals', async ({ page }) => {
  await signIn(page);
  await page.goto('/p/dashboard');
  await expect(page.getByRole('heading', { name: '跨租户经营信号与系统状态' })).toBeVisible();
  await expect(page.getByText('活跃租户', { exact: true })).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-P-001/platform-dashboard-desktop.png',
    fullPage: false,
  });
});
test('platform root enters the existing dashboard', async ({ page }) => {
  await signIn(page);
  await page.goto('/');
  await expect(page).toHaveURL(/\/p\/dashboard/);
});
test('platform dashboard rejects missing session', async ({ page }) => {
  await page.goto('/p/dashboard');
  await expect(page).toHaveURL('/login');
  await expect(page.getByPlaceholder('租户标识')).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-P-001/platform-dashboard-forbidden.png',
    fullPage: true,
  });
});
