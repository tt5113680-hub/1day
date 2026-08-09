import { expect, test, type Page } from '@playwright/test';

const applications = {
  consumer: 'http://127.0.0.1:3211',
  employee: 'http://127.0.0.1:3212',
  management: 'http://127.0.0.1:3213',
  platform: 'http://127.0.0.1:3214',
};
const tenant = 'luckin-oneday-human-pilot';
const password = 'OnedayHumanPilot!2026';
const store = '30000000-0000-4000-8000-000000000021';

async function signIn(page: Page, url: string, email: string, target: string, tenantSlug = tenant) {
  await page.goto(url);
  const inputs = page.locator('input');
  await inputs.nth(0).fill(tenantSlug);
  await inputs.nth(1).fill(email);
  await inputs.nth(2).fill(password);
  await page.locator('button').first().click();
  await page.waitForURL(target);
}

test('Batch 1 visual foundation captures Consumer phone and desktop storefronts', async ({
  browser,
}) => {
  const consumerUrl = `${applications.consumer}/c/stores/${store}?tenant=${tenant}&source=foundation-visual&scene=batch_1`;
  for (const [name, viewport] of [
    ['consumer-phone-390', { width: 390, height: 844 }],
    ['consumer-tablet-768', { width: 768, height: 1024 }],
    ['consumer-desktop-1024', { width: 1024, height: 900 }],
    ['consumer-desktop-1440', { width: 1440, height: 1024 }],
  ] as const) {
    const page = await browser.newPage({ viewport });
    await page.goto(consumerUrl, { waitUntil: 'networkidle' });
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('nav[aria-label="门店主导航"] a')).toHaveCount(5);
    const menuHref = await page
      .locator('nav[aria-label="门店主导航"] a', { hasText: '菜单' })
      .getAttribute('href');
    expect(menuHref).toContain(`/c/stores/${store}/menu`);
    expect(menuHref).toContain(`tenant=${tenant}`);
    expect(menuHref).toContain('scene=tab_menu');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    if (viewport.width >= 1024) {
      await expect(page.locator('nav[aria-label="门店桌面主导航"]')).toBeVisible();
      await expect(page.locator('nav[aria-label="门店主导航"]')).toBeHidden();
    } else {
      await expect(page.locator('nav[aria-label="门店主导航"]')).toBeVisible();
      await expect(page.locator('nav[aria-label="门店桌面主导航"]')).toBeHidden();
    }
    await page.screenshot({
      path: `evidence/COMMERCIAL-UI-FOUNDATION/${name}-v2.png`,
      fullPage: true,
    });
    await page.close();
  }
});

test('Batch 1 visual foundation captures Employee mobile workbench', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await signIn(
    page,
    `${applications.employee}/e/login`,
    'pilot.employee01@oneday.local',
    `${applications.employee}/e/workbench`,
  );
  await expect(page.locator('nav[aria-label="员工工作导航"] a')).toHaveCount(5);
  await expect(page.locator('main')).toBeVisible();
  await page.screenshot({
    path: 'evidence/COMMERCIAL-UI-FOUNDATION/employee-phone-390.png',
    fullPage: true,
  });
});

test('Batch 1 visual foundation captures Management and Platform administration shells', async ({
  browser,
}) => {
  const management = await browser.newPage({ viewport: { width: 1440, height: 1024 } });
  await signIn(
    management,
    `${applications.management}/login`,
    'pilot.owner@oneday.local',
    `${applications.management}/m/dashboard`,
  );
  await expect(management.locator('.od-admin-shell')).toBeVisible();
  await expect(management.locator('.od-admin-shell__sidebar nav a')).toHaveCount(9);
  await management.screenshot({
    path: 'evidence/COMMERCIAL-UI-FOUNDATION/management-desktop-1440.png',
    fullPage: true,
  });
  await management.goto(`${applications.management}/m/customers`, { waitUntil: 'networkidle' });
  await expect(
    management.getByRole('heading', { name: '用客户分层驱动每一次经营动作' }),
  ).toBeVisible();
  await expect(management.locator('.od-page-header')).toBeVisible();
  await management.screenshot({
    path: 'evidence/COMMERCIAL-UI-FOUNDATION/management-customers-desktop-1440.png',
    fullPage: true,
  });

  const platform = await browser.newPage({ viewport: { width: 1440, height: 1024 } });
  await signIn(
    platform,
    `${applications.platform}/login`,
    'pilot.platform@oneday.local',
    `${applications.platform}/p/dashboard`,
    'system',
  );
  await expect(platform.locator('.od-admin-shell')).toBeVisible();
  await expect(platform.locator('.od-admin-shell__sidebar nav a')).toHaveCount(8);
  await platform.screenshot({
    path: 'evidence/COMMERCIAL-UI-FOUNDATION/platform-desktop-1440.png',
    fullPage: true,
  });
});
