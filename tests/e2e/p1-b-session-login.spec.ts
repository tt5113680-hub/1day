import { expect, test } from '@playwright/test';

const apps = {
  employee: 'http://127.0.0.1:3222',
  management: 'http://127.0.0.1:3223',
  platform: 'http://127.0.0.1:3224',
};
const tenant = 'luckin-oneday-human-pilot';
const password = 'OnedayHumanPilot!2026';

test('P1-B promotion-grade login surfaces use labeled fields and design tokens', async ({
  browser,
}) => {
  const cases = [
    {
      name: 'employee',
      url: `${apps.employee}/e/login`,
      title: '员工登录',
      email: 'pilot.employee01@oneday.local',
      destination: `${apps.employee}/e/workbench`,
    },
    {
      name: 'management',
      url: `${apps.management}/login`,
      title: '管理端登录',
      email: 'pilot.owner@oneday.local',
      destination: `${apps.management}/m/dashboard`,
    },
    {
      name: 'platform',
      url: `${apps.platform}/login`,
      title: '平台登录',
      email: 'pilot.platform@oneday.local',
      destination: `${apps.platform}/p/dashboard`,
      tenantSlug: 'system',
    },
  ] as const;

  for (const item of cases) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(item.url);
    await expect(page.getByRole('heading', { name: item.title })).toBeVisible();
    await expect(page.getByLabel('租户标识')).toBeVisible();
    await expect(page.getByLabel('邮箱')).toBeVisible();
    await expect(page.getByLabel('密码')).toBeVisible();
    await page.getByLabel('租户标识').fill(item.tenantSlug ?? tenant);
    await page.getByLabel('邮箱').fill(item.email);
    await page.getByLabel('密码').fill(password);
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForURL(item.destination);
    await page.screenshot({
      path: `evidence/P1-B/login-${item.name}-390.png`,
      fullPage: true,
    });
    await page.close();
  }
});
