import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { Client } from '../../apps/api/node_modules/pg/esm/index.mjs';
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test',
  stamp = Date.now(),
  tid = randomUUID(),
  org = randomUUID(),
  merchant = randomUUID(),
  store = randomUUID(),
  service = randomUUID(),
  action = randomUUID(),
  slug = `service-browser-${stamp}`;
test.beforeAll(async () => {
  const c = new Client({ connectionString: db });
  await c.connect();
  try {
    await c.query(
      "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,'服务浏览器商户','active',null,null)",
      [tid, slug],
    );
    await c.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,'服务浏览器组织','enterprise','active',null,null)",
      [org, tid, `org-${stamp}`],
    );
    await c.query(
      "insert into merchants(id,tenant_id,organization_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,'服务商户','active',null,null)",
      [merchant, tid, org, `merchant-${stamp}`],
    );
    await c.query(
      "insert into stores(id,tenant_id,organization_id,merchant_id,code,name,address,status,created_by,updated_by) values($1,$2,$3,$4,$5,'服务体验门店','人民广场 8 号','active',null,null)",
      [store, tid, org, merchant, `store-${stamp}`],
    );
    await c.query(
      "insert into external_actions(id,tenant_id,code,name,action_type,platform,status,created_by,updated_by) values($1,$2,$3,'立即咨询','platform_entry','web','active',null,null)",
      [action, tid, `action-${stamp}`],
    );
    await c.query(
      "insert into store_services(id,tenant_id,store_id,code,name,description,duration_minutes,price_label,status,created_by,updated_by) values($1,$2,$3,$4,'尊享定制服务','先评估再安排',90,'¥299 起','active',null,null)",
      [service, tid, store, `service-${stamp}`],
    );
    await c.query(
      "insert into store_benefits(id,tenant_id,store_id,title,description,external_action_id,status,created_by,updated_by) values($1,$2,$3,'服务专属权益','咨询后可领取',$4,'active',null,null)",
      [randomUUID(), tid, store, action],
    );
  } finally {
    await c.end();
  }
});
test('consumer service detail renders and records intent', async ({ page }) => {
  await page.goto(`http://127.0.0.1:3039/c/services/${service}?tenant=${slug}&source=store:detail`);
  await expect(page.getByRole('heading', { name: '尊享定制服务' })).toBeVisible();
  await expect(page.getByText('服务体验门店', { exact: true })).toBeVisible();
  await expect(page.getByText('服务专属权益')).toBeVisible();
  await page.getByRole('button', { name: '立即咨询' }).click();
  await expect(page.getByRole('status')).toContainText('已记录你的服务意向');
  await page.screenshot({
    path: 'evidence/PAGE-C-004/consumer-service-mobile.png',
    fullPage: true,
  });
});
test('consumer service detail shows unavailable', async ({ page }) => {
  await page.goto(
    'http://127.0.0.1:3039/c/services/00000000-0000-4000-8000-000000000000?tenant=missing-service',
  );
  await expect(page.getByRole('heading', { name: '服务暂不可访问' })).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-C-004/consumer-service-forbidden.png',
    fullPage: true,
  });
});
