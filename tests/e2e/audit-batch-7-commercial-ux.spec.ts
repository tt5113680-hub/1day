import { expect, test, type Page } from '@playwright/test';
import { Client } from '../../apps/api/node_modules/pg/esm/index.mjs';
import {
  cleanupCommercialSimulation,
  commercialSimulation,
  commercialSimulationIds,
  seedCommercialSimulation,
} from '../fixtures/commercial-simulation.mjs';

process.env.NODE_ENV = 'test';
const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const consumerBase = 'http://127.0.0.1:3191';
const employeeBase = 'http://127.0.0.1:3192';
const managementBase = 'http://127.0.0.1:3193';
const platformBase = 'http://127.0.0.1:3194';
const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl4qQAAAABJRU5ErkJggg==',
  'base64',
);

async function signIn(page: Page, url: string, account: string, tenant: string) {
  await page.goto(url);
  const inputs = page.locator('input');
  await inputs.nth(0).fill(tenant);
  await inputs.nth(1).fill(account);
  await inputs.nth(2).fill(commercialSimulation.password);
  await page.locator('button').first().click();
}

test.beforeAll(async () => {
  await seedCommercialSimulation(databaseUrl);
});

test.afterAll(async () => {
  await cleanupCommercialSimulation(databaseUrl);
});

test('AUDIT-BATCH-7 presents the real commercial journey in business language without weakening isolation', async ({
  browser,
}) => {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const consumer = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await consumer.goto(
      `${consumerBase}/c/actions/${commercialSimulationIds.consumerAction}?tenant=${commercialSimulation.tenants.luckin.slug}&source=scene:audit_batch_7&shareCode=H002-LUCKIN-SHARE`,
    );
    await expect(consumer.getByText('先记录本次咨询，再前往目标平台')).toBeVisible();
    await expect(consumer.getByRole('button', { name: '记录咨询并获取口令' })).toBeVisible();
    await consumer.getByRole('button', { name: '记录咨询并获取口令' }).click();
    await expect(consumer.getByText('本次咨询已记录。请复制下方口令')).toBeVisible();
    await consumer.screenshot({
      path: 'evidence/AUDIT-BATCH-7/consumer-action.png',
      fullPage: true,
    });

    const created = await expect
      .poll(async () => {
        const result = await client.query(
          `select customer_id,task_id from consumer_operating_projections
           where tenant_id=$1 and payload->>'actionId'=$2 order by created_at desc limit 1`,
          [commercialSimulation.tenants.luckin.id, commercialSimulationIds.consumerAction],
        );
        return result.rows[0] ?? null;
      })
      .toEqual(
        expect.objectContaining({ customer_id: expect.any(String), task_id: expect.any(String) }),
      );
    void created;
    const projection = (
      await client.query(
        `select customer_id,task_id from consumer_operating_projections
         where tenant_id=$1 and payload->>'actionId'=$2 order by created_at desc limit 1`,
        [commercialSimulation.tenants.luckin.id, commercialSimulationIds.consumerAction],
      )
    ).rows[0];

    const employee = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await signIn(
      employee,
      `${employeeBase}/e/login`,
      commercialSimulation.accounts.employee01,
      commercialSimulation.tenants.luckin.slug,
    );
    await employee.waitForURL(`${employeeBase}/e/workbench`);
    await employee.goto(`${employeeBase}/e/tasks/${projection.task_id}`);
    await expect(employee.getByRole('heading', { name: '跟进公开咨询客户' })).toBeVisible();
    await expect(employee.getByText('客户完成公开咨询（场景：audit batch 7）')).toBeVisible();
    await expect(employee.getByText('公开咨询客户', { exact: true })).toBeVisible();
    await expect(employee.locator('main')).not.toContainText('Consumer action');
    await expect(employee.locator('footer')).toHaveCSS('position', 'static');
    await expect(employee.locator('footer button')).toHaveCount(1);
    await expect(employee.locator('footer a')).toHaveCount(2);

    await employee.goto(`${employeeBase}/e/tasks/${projection.task_id}/follow-up`);
    await employee.locator('textarea').first().fill('员工已完成客户咨询回访。');
    await employee.locator('textarea').nth(2).fill('客户需求已确认，准备记录结果。');
    await employee.locator('footer button').click();
    await employee.goto(`${employeeBase}/e/tasks/${projection.task_id}`);
    await employee.getByLabel('第三方结果单号').fill(`B7-${Date.now()}`);
    await employee.getByLabel('图片证据').setInputFiles({
      name: 'audit-batch-7.png',
      mimeType: 'image/png',
      buffer: tinyPng,
    });
    await expect(employee.getByRole('button', { name: '保存结果与证据' })).toBeVisible();
    const resultBox = await employee.locator('section:has(#result-title)').boundingBox();
    const footerBox = await employee.locator('footer').boundingBox();
    if (!resultBox || !footerBox) throw Error('TASK_LAYOUT_NOT_RENDERED');
    expect(footerBox.y).toBeGreaterThan(resultBox.y + resultBox.height);
    await employee.screenshot({
      path: 'evidence/AUDIT-BATCH-7/employee-result.png',
      fullPage: true,
    });
    await employee.getByRole('button', { name: '保存结果与证据' }).click();
    await employee.locator('footer button').click();

    const owner = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await signIn(
      owner,
      `${managementBase}/login`,
      commercialSimulation.accounts.owner,
      commercialSimulation.tenants.luckin.slug,
    );
    await owner.waitForURL(`${managementBase}/m/dashboard`);
    await owner.goto(`${managementBase}/m/customers/${projection.customer_id}`);
    await expect(owner.getByText('首次来源 · 员工分享')).toBeVisible();
    await expect(owner.getByText('跟进公开咨询客户', { exact: true })).toBeVisible();
    await expect(owner.getByRole('heading', { name: '公开咨询客户' })).toBeVisible();
    await expect(owner.locator('main')).not.toContainText('employee_share');
    await expect(owner.locator('main')).not.toContainText('completed');
    await owner.screenshot({ path: 'evidence/AUDIT-BATCH-7/management-trail.png', fullPage: true });

    const otherTenantOwner = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await signIn(
      otherTenantOwner,
      `${managementBase}/login`,
      commercialSimulation.accounts.restaurantB,
      commercialSimulation.tenants.restaurantB.slug,
    );
    await otherTenantOwner.waitForURL(`${managementBase}/m/dashboard`);
    const crossTenantRead = otherTenantOwner.waitForResponse(
      (response) =>
        response.url() ===
        `http://127.0.0.1:3190/api/v1/management/customers/${projection.customer_id}`,
    );
    await otherTenantOwner.goto(`${managementBase}/m/customers/${projection.customer_id}`);
    expect((await crossTenantRead).status()).toBe(404);
    await expect(otherTenantOwner.locator('main')).not.toContainText('员工分享');

    const platform = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await signIn(
      platform,
      `${platformBase}/login`,
      commercialSimulation.accounts.platform,
      commercialSimulation.tenants.system.slug,
    );
    await platform.waitForURL(`${platformBase}/p/dashboard`);
    await expect(platform.locator('main')).toBeVisible();
  } finally {
    await client.end();
  }
});
