import { expect, test, type Page } from '@playwright/test';

const api = 'http://127.0.0.1:3200';
const consumer = 'http://127.0.0.1:3201';
const employee = 'http://127.0.0.1:3202';
const management = 'http://127.0.0.1:3203';
const platform = 'http://127.0.0.1:3204';
const luckin = 'luckin-oneday-human-pilot';
const password = 'OnedayHumanPilot!2026';
const stores = [
  '30000000-0000-4000-8000-000000000021',
  '30000000-0000-4000-8000-000000000022',
  '30000000-0000-4000-8000-000000000023',
];
const externalAction = '30000000-0000-4000-8000-000000000044';

async function signIn(page: Page, loginUrl: string, tenant: string, email: string, target: string) {
  await page.goto(loginUrl);
  const inputs = page.locator('input');
  await inputs.nth(0).fill(tenant);
  await inputs.nth(1).fill(email);
  await inputs.nth(2).fill(password);
  await page.locator('button').first().click();
  await page.waitForURL(target);
}

test('COMMERCIAL-UI-ALIGNMENT: commercial storefront uses real store data and outbound actions', async ({
  browser,
}) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  for (const storeId of stores) {
    await page.goto(
      `${consumer}/c/stores/${storeId}?tenant=${luckin}&source=discovery:commercial-ui&scene=human_pilot&shareCode=COMMERCIAL-UI`,
    );
    await expect(page.locator('main#top')).toBeVisible();
    await expect(page.locator('main#top img').first()).toBeVisible();
    await expect(page.getByText(/400-820-000/)).toHaveCount(1);
    await expect(page.locator(`a[href*="/c/actions/${externalAction}"]`).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /导航/ }).first()).toBeVisible();
  }

  await page.goto(
    `${consumer}/c/stores/${stores[0]}?tenant=${luckin}&source=discovery:commercial-ui&scene=human_pilot&shareCode=COMMERCIAL-UI`,
  );
  await page.route('https://uri.amap.com/**', (route) =>
    route.fulfill({ status: 200, body: 'map' }),
  );
  const navigationOutbound = page.waitForResponse(
    (response) =>
      response.url().startsWith(`${api}/api/v1/consumer/stores/${stores[0]}/outbound`) &&
      response.status() === 201,
  );
  await page.getByRole('button', { name: /导航/ }).first().click();
  await navigationOutbound;
  await page.goto(
    `${consumer}/c/stores/${stores[0]}?tenant=${luckin}&source=discovery:commercial-ui&scene=human_pilot&shareCode=COMMERCIAL-UI`,
  );
  await page.locator(`a[href*="/c/actions/${externalAction}"]`).click();
  await expect(page).toHaveURL(/\/c\/actions\//);
  const outbound = page.waitForResponse(
    (response) =>
      response.url() ===
        `${api}/api/v1/consumer/actions/${externalAction}/confirm?tenant=${luckin}` &&
      response.status() === 201,
  );
  await page.locator('button').first().click();
  await outbound;
});

test('COMMERCIAL-UI-ALIGNMENT: protected terminals keep real sessions across reload and logout', async ({
  browser,
}) => {
  const managementPage = await browser.newPage();
  await signIn(
    managementPage,
    `${management}/login`,
    luckin,
    'pilot.owner@oneday.local',
    `${management}/m/dashboard`,
  );
  await managementPage.goto(`${management}/m/stores`);
  await expect(managementPage.locator('main')).toBeVisible();
  await managementPage.reload();
  await expect(managementPage.locator('main')).toBeVisible();
  await expect(managementPage.locator('input').first()).toBeVisible();
  await managementPage.getByRole('button', { name: '退出登录' }).click();
  await expect(managementPage).toHaveURL(`${management}/login`);

  const platformPage = await browser.newPage();
  await signIn(
    platformPage,
    `${platform}/login`,
    'system',
    'pilot.platform@oneday.local',
    `${platform}/p/dashboard`,
  );
  await platformPage.reload();
  await expect(platformPage.locator('main')).toBeVisible();

  const employeePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await signIn(
    employeePage,
    `${employee}/e/login`,
    luckin,
    'pilot.employee01@oneday.local',
    `${employee}/e/workbench`,
  );
  await expect(employeePage.locator('nav[aria-label="员工工作导航"] a')).toHaveCount(5);
});
