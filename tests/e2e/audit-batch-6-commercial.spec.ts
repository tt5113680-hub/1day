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
const consumerBase = 'http://127.0.0.1:3181';
const employeeBase = 'http://127.0.0.1:3182';
const managementBase = 'http://127.0.0.1:3183';
const platformBase = 'http://127.0.0.1:3184';
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

test('AUDIT-BATCH-6 runs the public consumer-to-employee-to-management journey with real sessions', async ({
  browser,
}) => {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const consumer = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await consumer.goto(
      `${consumerBase}/c/actions/${commercialSimulationIds.consumerAction}?tenant=${commercialSimulation.tenants.luckin.slug}&source=scene:audit_batch_6&shareCode=H002-LUCKIN-SHARE`,
    );
    await consumer.locator('button').first().click();
    await expect(consumer.locator('main')).toBeVisible();
    await consumer.screenshot({
      path: 'evidence/AUDIT-BATCH-6/consumer-public-action.png',
      fullPage: true,
    });

    const projection = await expect
      .poll(async () => {
        const result = await client.query(
          `select customer_id,task_id,assignment_basis
           from consumer_operating_projections
           where tenant_id=$1 and payload->>'actionId'=$2
           order by created_at desc limit 1`,
          [commercialSimulation.tenants.luckin.id, commercialSimulationIds.consumerAction],
        );
        return result.rows[0] ?? null;
      })
      .toEqual(expect.objectContaining({ assignment_basis: 'employee_share' }));
    void projection;
    const created = (
      await client.query(
        `select customer_id,task_id from consumer_operating_projections
         where tenant_id=$1 and payload->>'actionId'=$2 order by created_at desc limit 1`,
        [commercialSimulation.tenants.luckin.id, commercialSimulationIds.consumerAction],
      )
    ).rows[0];
    expect(created.task_id).toBeTruthy();

    const employee = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await signIn(
      employee,
      `${employeeBase}/e/login`,
      commercialSimulation.accounts.employee01,
      commercialSimulation.tenants.luckin.slug,
    );
    await employee.waitForURL(`${employeeBase}/e/workbench`);
    await employee.goto(`${employeeBase}/e/tasks/${created.task_id}/follow-up`);
    await employee
      .locator('textarea')
      .first()
      .fill('Consumer consultation completed in the test journey.');
    await employee
      .locator('textarea')
      .nth(2)
      .fill('Follow-up result recorded by the assigned employee.');
    await employee.locator('footer button').click();
    await expect(employee.locator('main')).toBeVisible();

    await employee.goto(`${employeeBase}/e/tasks/${created.task_id}`);
    await employee.locator('input:not([type="file"])').first().fill(`B6-${Date.now()}`);
    await employee.locator('input[type="file"]').setInputFiles({
      name: 'audit-batch-6.png',
      mimeType: 'image/png',
      buffer: tinyPng,
    });
    await employee.locator('section:has(#result-title) button').click();
    await expect(employee.locator('#evidence-title')).toBeVisible();
    await employee.locator('footer button').click();
    await employee.screenshot({
      path: 'evidence/AUDIT-BATCH-6/employee-result-and-evidence.png',
      fullPage: true,
    });

    const outcome = await client.query(
      `select (select count(*)::int from task_follow_ups where tenant_id=$1 and task_id=$2) follow_ups,
              (select count(*)::int from task_evidence_links where tenant_id=$1 and task_id=$2 and deleted_at is null) evidence_links,
              (select status from tasks where tenant_id=$1 and id=$2) task_status,
              (select count(*)::int from audit_logs where tenant_id=$1 and resource_id=$2 and action='employee.task_result_recorded') result_audits,
              (select count(*)::int from outbox_events where tenant_id=$1 and aggregate_id=$2 and event_type='employee.task.result_recorded.v1') result_outbox`,
      [commercialSimulation.tenants.luckin.id, created.task_id],
    );
    expect(outcome.rows[0]).toEqual({
      follow_ups: 1,
      evidence_links: 1,
      task_status: 'completed',
      result_audits: 1,
      result_outbox: 1,
    });

    const owner = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await signIn(
      owner,
      `${managementBase}/login`,
      commercialSimulation.accounts.owner,
      commercialSimulation.tenants.luckin.slug,
    );
    await owner.waitForURL(`${managementBase}/m/dashboard`);
    await owner.goto(`${managementBase}/m/customers/${created.customer_id}`);
    await expect(owner.locator('main')).toContainText('员工分享');
    await expect(owner.locator('main')).toContainText('已完成');
    await owner.screenshot({
      path: 'evidence/AUDIT-BATCH-6/management-commercial-trail.png',
      fullPage: true,
    });

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
        `http://127.0.0.1:3180/api/v1/management/customers/${created.customer_id}`,
    );
    await otherTenantOwner.goto(`${managementBase}/m/customers/${created.customer_id}`);
    expect((await crossTenantRead).status()).toBe(404);
    await expect(otherTenantOwner.locator('main')).not.toContainText('employee_share');

    const unassignedEmployee = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await signIn(
      unassignedEmployee,
      `${employeeBase}/e/login`,
      commercialSimulation.accounts.employee02,
      commercialSimulation.tenants.luckin.slug,
    );
    await unassignedEmployee.waitForURL(`${employeeBase}/e/workbench`);
    const unassignedTaskRead = unassignedEmployee.waitForResponse(
      (response) =>
        response.url() === `http://127.0.0.1:3180/api/v1/employee/tasks/${created.task_id}`,
    );
    await unassignedEmployee.goto(`${employeeBase}/e/tasks/${created.task_id}`);
    expect((await unassignedTaskRead).status()).toBe(404);
    await expect(unassignedEmployee.locator('main')).not.toContainText('audit-batch-6.png');

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
