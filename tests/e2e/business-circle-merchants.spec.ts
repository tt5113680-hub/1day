import { expect, test } from '@playwright/test';

const api = 'http://127.0.0.1:3155';
let token = '';
test.beforeAll(async () => {
  const login = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@system.local',
      password: 'ChangeMe123!',
      tenantId: '00000000-0000-4000-8000-000000000001',
    }),
  });
  expect(login.status).toBe(201);
  token = (await login.json()).accessToken;
});
test('circle manager sees prepared invitations and approval controls', async ({ page }) => {
  await page.addInitScript((value) => sessionStorage.setItem('oneday.accessToken', value), token);
  await page.goto('/bc/merchants');
  await expect(page.locator('h1')).toContainText('Invite, review and display');
  await expect(page.getByText('Merchant review queue')).toBeVisible();
  await page.screenshot({
    path: 'evidence/CIRCLE-002/business-circle-merchants-desktop.png',
    fullPage: false,
  });
});
test('circle merchant management rejects a missing session', async ({ page }) => {
  await page.goto('/bc/merchants');
  await expect(page.locator('h1')).toContainText('restricted');
  await page.screenshot({
    path: 'evidence/CIRCLE-002/business-circle-merchants-forbidden.png',
    fullPage: true,
  });
});
