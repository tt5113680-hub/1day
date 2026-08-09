import { expect, test } from '@playwright/test';

const api = 'http://127.0.0.1:3261';
const consumerBase = 'http://localhost:3262';
const system = '00000000-0000-4000-8000-000000000001';

const h = (token: string, tenant: string, more: Record<string, string> = {}) => ({
  authorization: `Bearer ${token}`,
  'x-tenant-context': tenant,
  'x-request-id': crypto.randomUUID(),
  'content-type': 'application/json',
  ...more,
});

test('Consumer DOM follows published module order and hides invisible modules', async ({
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
  const stamp = `ui-${Date.now()}`;
  const slug = `mod-ui-${stamp}`;
  const email = `${slug}@example.test`;
  const password = `ModuleUi-${stamp}-Password!`;
  const provision = await fetch(`${api}/api/v1/platform/onboarding`, {
    method: 'POST',
    headers: h(systemToken, system, { 'idempotency-key': crypto.randomUUID() }),
    body: JSON.stringify({
      slug,
      tenantName: `Module UI ${stamp}`,
      organizationName: 'Module UI HQ',
      merchantName: 'Module UI Merchant',
      storeName: 'Module UI Store',
      address: '78 Module UI Road',
      phone: '021-55557800',
      businessHours: '09:00-21:00',
      adminName: 'Module UI Owner',
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

  const draftCreate = await fetch(`${api}/api/v1/page-templates/${template.id}/drafts`, {
    method: 'POST',
    headers: h(ownerToken, run.tenantId),
    body: JSON.stringify({ sourceVersionId: template.live_version_id }),
  });
  expect(draftCreate.status).toBe(201);
  const draft = (await draftCreate.json()).data;

  const modules = [
    { moduleType: 'store_hero', config: { visible: true } },
    { moduleType: 'content_feed', config: { visible: true } },
    { moduleType: 'quick_actions', config: { capabilities: ['consult', 'phone'], visible: true } },
    { moduleType: 'banner_carousel', config: { limit: 2, visible: false } },
    { moduleType: 'service_catalog', config: { visible: true } },
    { moduleType: 'store_info', config: { visible: true } },
  ];
  const update = await fetch(`${api}/api/v1/page-templates/${template.id}/drafts/${draft.id}`, {
    method: 'PUT',
    headers: h(ownerToken, run.tenantId),
    body: JSON.stringify({ version: draft.version ?? 1, modules }),
  });
  expect(update.status).toBe(200);

  const refreshed = await (
    await fetch(`${api}/api/v1/page-templates`, { headers: h(ownerToken, run.tenantId) })
  ).json();
  const current = refreshed.data.find((item: { id: string }) => item.id === template.id);
  const publish = await fetch(`${api}/api/v1/page-templates/${template.id}/publish`, {
    method: 'POST',
    headers: h(ownerToken, run.tenantId),
    body: JSON.stringify({
      versionId: draft.id,
      templateVersion: current.version,
      bindingVersion: current.binding_version,
    }),
  });
  expect(publish.status).toBe(201);

  await page.goto(
    `${consumerBase}/c/stores/${template.store_id}?tenant=${encodeURIComponent(slug)}`,
  );
  await expect(page.locator('[data-module="store_hero"]')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('[data-module="banner_carousel"]')).toHaveCount(0);
  await expect(page.locator('[data-module="quick_actions"]')).toBeVisible();
  await expect(page.locator('[data-module="content_feed"]')).toBeVisible();
  await expect(page.locator('[data-module="service_catalog"]')).toBeVisible();
  await expect(page.locator('[data-module="store_info"]')).toBeVisible();

  const order = await page
    .locator('[data-module]')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-module')));
  expect(order).toEqual([
    'store_hero',
    'content_feed',
    'quick_actions',
    'service_catalog',
    'store_info',
  ]);

  await page.screenshot({
    path: 'evidence/STOREFRONT-MODULE-RENDERER/consumer-modules-order.png',
    fullPage: true,
  });
});
