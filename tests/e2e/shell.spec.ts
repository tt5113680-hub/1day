import { expect, test } from '@playwright/test';
test('consumer shell renders and produces a repeatable screenshot', async ({ page }) => {
  await page.goto('http://127.0.0.1:3020');
  await expect(page.getByRole('heading', { name: '发现值得行动的服务' })).toBeVisible();
  await page.screenshot({ path: 'evidence/FOUNDATION-010/consumer-shell.png', fullPage: true });
});
