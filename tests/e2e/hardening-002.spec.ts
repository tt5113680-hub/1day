import { expect, test } from '@playwright/test';

const api = 'http://127.0.0.1:3170/api/v1';
const tenant = '00000000-0000-4000-8000-000000000001';
let token = '';

test.beforeAll(async () => {
  const response = await fetch(`${api}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@system.local',
      password: 'ChangeMe123!',
      tenantId: tenant,
    }),
  });
  expect(response.status).toBe(201);
  token = (await response.json()).accessToken;
});

test('commercial MVP terminals expose their live consumer, employee, management and channel states', async ({
  browser,
}) => {
  const consumer = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await consumer.goto('http://127.0.0.1:3171/c/entry?tenant=system');
  await expect(consumer.locator('main')).toBeVisible();
  await consumer.screenshot({ path: 'evidence/HARDENING-002/consumer-mobile.png', fullPage: true });

  for (const [url, path] of [
    ['http://127.0.0.1:3172/e/workbench', 'employee-mobile.png'],
    ['http://127.0.0.1:3173/m/dashboard', 'management-desktop.png'],
    ['http://127.0.0.1:3174/ch/dashboard', 'channel-desktop.png'],
  ]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.addInitScript((value) => sessionStorage.setItem('oneday.accessToken', value), token);
    await page.goto(url);
    await expect(page.locator('main')).toBeVisible();
    await page.screenshot({ path: `evidence/HARDENING-002/${path}`, fullPage: true });
    await page.close();
  }
  await consumer.close();
});
