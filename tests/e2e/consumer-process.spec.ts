import { expect, test } from '@playwright/test';
import { createHash, randomUUID } from 'node:crypto';
import { Client } from '../../apps/api/node_modules/pg/esm/index.mjs';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const hash = (token: string) => createHash('sha256').update(token).digest('hex');
let tenant = '';
let processId = '';
let access = '';
let client: Client;
test.beforeAll(async () => {
  client = new Client({ connectionString: db });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const tenantId = randomUUID();
  const customer = randomUUID();
  const order = randomUUID();
  processId = randomUUID();
  access = `browser-access-${stamp}`;
  tenant = `browser-process-${stamp}`;
  await client.query(
    "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,'进度体验商家','active',null,null)",
    [tenantId, tenant],
  );
  await client.query(
    "insert into customers(id,tenant_id,display_name,status,created_by,updated_by) values($1,$2,'Private','active',null,null)",
    [customer, tenantId],
  );
  await client.query(
    "insert into customer_orders(id,tenant_id,customer_id,order_number,occurred_at,status,created_by,updated_by) values($1,$2,$3,'BROWSER-PROCESS',now(),'active',null,null)",
    [order, tenantId, customer],
  );
  await client.query(
    "insert into verification_codes(id,tenant_id,order_id,code_hash,expires_at,status,created_by,updated_by) values($1,$2,$3,$4,'2030-01-01','redeemed',null,null)",
    [randomUUID(), tenantId, order, hash('code')],
  );
  await client.query(
    "insert into consumer_process_accesses(id,tenant_id,customer_id,order_id,access_token_hash,appointment_at,consultation_status,exception_feedback,expires_at,status,created_by,updated_by) values($1,$2,$3,$4,$5,now(),'completed','顾问已更新预约时间','2030-01-01','active',null,null)",
    [processId, tenantId, customer, order, hash(access)],
  );
});
test.afterAll(async () => client.end());
test('consumer sees a private process timeline at 390px', async ({ page }) => {
  await page.goto(`/c/processes/${processId}?tenant=${tenant}&access=${access}`);
  await expect(page.getByRole('heading', { name: '服务正在为你推进' })).toBeVisible();
  await expect(page.getByText('BROWSER-PROCESS')).toBeVisible();
  await expect(page.getByText('顾问已更新预约时间')).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-C-006/consumer-process-mobile.png',
    fullPage: true,
  });
});
test('invalid consumer access shows recovery state at 390px', async ({ page }) => {
  await page.goto(`/c/processes/${processId}?tenant=${tenant}&access=wrong`);
  await expect(page.getByRole('heading', { name: '进度暂不可查看' })).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-C-006/consumer-process-forbidden.png',
    fullPage: true,
  });
});
