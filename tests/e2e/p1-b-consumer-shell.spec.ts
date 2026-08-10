import { expect, test } from '@playwright/test';

const api = 'http://127.0.0.1:3271';
const consumerBase = 'http://localhost:3272';
const system = '00000000-0000-4000-8000-000000000001';

const h = (token: string, tenant: string, more: Record<string, string> = {}) => ({
  authorization: `Bearer ${token}`,
  'x-tenant-context': tenant,
  'x-request-id': crypto.randomUUID(),
  'content-type': 'application/json',
  ...more,
});

test('Consumer shell shares token-driven nav across mobile and desktop viewports', async ({
  page,
}) => {
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
  const systemToken = (await login.json()).accessToken as string;
  const stamp = `shell-${Date.now()}`;
  const slug = `shell-${stamp}`;
  const email = `${slug}@example.test`;
  const password = `Shell-${stamp}-Password!`;
  const provision = await fetch(`${api}/api/v1/platform/onboarding`, {
    method: 'POST',
    headers: h(systemToken, system, { 'idempotency-key': crypto.randomUUID() }),
    body: JSON.stringify({
      slug,
      tenantName: `Consumer Shell ${stamp}`,
      organizationName: 'Shell HQ',
      merchantName: 'Shell Merchant',
      storeName: 'Shell Store',
      address: '88 Shell Road',
      phone: '021-55558800',
      businessHours: '09:00-21:00',
      adminName: 'Shell Owner',
      adminEmail: email,
      adminPassword: password,
      industry: 'restaurant',
      plan: 'starter',
    }),
  });
  expect(provision.status).toBe(201);
  const run = (await provision.json()).data;
  expect(run.state).toBe('ready');

  const ownerLogin = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, tenantId: run.tenantId }),
  });
  expect(ownerLogin.status).toBe(201);
  const ownerToken = (await ownerLogin.json()).accessToken as string;

  const list = await fetch(`${api}/api/v1/page-templates`, {
    headers: h(ownerToken, run.tenantId),
  });
  expect(list.status).toBe(200);
  const template = (await list.json()).data.find(
    (item: { binding_id?: string }) => item.binding_id,
  );
  expect(template).toBeTruthy();

  // Mobile: shared bottom nav chrome with the five consumer tabs.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(
    `${consumerBase}/c/stores/${template.store_id}?tenant=${encodeURIComponent(slug)}`,
  );
  await expect(page.locator('.od-consumer-nav--bottom')).toBeVisible({ timeout: 30000 });
  await expect(
    page.locator('.od-consumer-nav--bottom .od-consumer-nav__link').first(),
  ).toContainText('首页');
  await expect(page.locator('.od-consumer-nav--bottom .od-consumer-nav__link--active')).toHaveCount(
    1,
  );
  await expect(
    page.locator('.od-consumer-nav--bottom .od-consumer-nav__link').nth(1),
  ).toContainText('团购');
  await page.screenshot({
    path: 'evidence/P1-B-CONSUMER-SHELL/consumer-shell-mobile-390.png',
    fullPage: true,
  });

  // Tablet: bottom nav is centred and still the navigation surface.
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.reload();
  await expect(page.locator('.od-consumer-nav--bottom')).toBeVisible();
  await page.screenshot({
    path: 'evidence/P1-B-CONSUMER-SHELL/consumer-shell-tablet-768.png',
    fullPage: true,
  });

  // Desktop: sticky top nav appears and the bottom bar is replaced.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.reload();
  await expect(page.locator('.od-consumer-nav--desktop')).toBeVisible({ timeout: 30000 });
  // Bottom nav node remains in the shell but is hidden (display:none) at desktop width.
  await expect(page.locator('.od-consumer-nav--bottom')).toBeHidden();
  await expect(page.locator('.od-consumer-nav--desktop .od-consumer-nav__link--active')).toHaveCount(
    1,
  );
  await page.screenshot({
    path: 'evidence/P1-B-CONSUMER-SHELL/consumer-shell-desktop-1440.png',
    fullPage: true,
  });
});
