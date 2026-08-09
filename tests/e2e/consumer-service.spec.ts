import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { Client } from '../../apps/api/node_modules/pg/esm/index.mjs';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const stamp = Date.now();
const tid = randomUUID();
const org = randomUUID();
const merchant = randomUUID();
const store = randomUUID();
const service = randomUUID();
const action = randomUUID();
const slug = `service-browser-${stamp}`;

test.beforeAll(async () => {
  const client = new Client({ connectionString: db });
  await client.connect();
  try {
    await client.query(
      "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,'服务浏览器商户','active',null,null)",
      [tid, slug],
    );
    await client.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,'服务浏览器组织','enterprise','active',null,null)",
      [org, tid, `org-${stamp}`],
    );
    await client.query(
      "insert into merchants(id,tenant_id,organization_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,'服务商户','active',null,null)",
      [merchant, tid, org, `merchant-${stamp}`],
    );
    await client.query(
      "insert into stores(id,tenant_id,organization_id,merchant_id,code,name,address,business_hours,status,created_by,updated_by) values($1,$2,$3,$4,$5,'服务体验门店','人民广场 8 号','10:00-22:00','active',null,null)",
      [store, tid, org, merchant, `store-${stamp}`],
    );
    await client.query(
      "insert into external_actions(id,tenant_id,code,name,action_type,platform,status,created_by,updated_by) values($1,$2,$3,'美团团购','platform_entry','meituan','active',null,null)",
      [action, tid, `action-${stamp}`],
    );
    await client.query(
      "insert into store_services(id,tenant_id,store_id,code,name,description,duration_minutes,price_label,status,created_by,updated_by) values($1,$2,$3,$4,'尊享定制服务','套餐含两份饮品，到店自取',90,'¥299 起','active',null,null)",
      [service, tid, store, `service-${stamp}`],
    );
    await client.query(
      'insert into store_external_actions(id,tenant_id,store_id,external_action_id,sort_order,enabled,created_by,updated_by) values($1,$2,$3,$4,0,true,null,null)',
      [randomUUID(), tid, store, action],
    );
    await client.query(
      "insert into store_service_platform_offers(id,tenant_id,store_id,service_id,external_action_id,offer_price,market_price,sort_order,status,created_by,updated_by) values($1,$2,$3,$4,$5,199,299,0,'active',null,null)",
      [randomUUID(), tid, store, service, action],
    );
    await client.query(
      "insert into store_content_items(id,tenant_id,store_id,content_type,title,summary,status,created_by,updated_by) values($1,$2,$3,'article','门店资料','下单后到店向工作人员出示平台订单','active',null,null)",
      [randomUUID(), tid, store],
    );
    await client.query(
      "insert into store_benefits(id,tenant_id,store_id,title,description,external_action_id,status,created_by,updated_by) values($1,$2,$3,'服务专属权益','咨询后可领取',$4,'active',null,null)",
      [randomUUID(), tid, store, action],
    );
  } finally {
    await client.end();
  }
});

test('consumer service detail renders product data and platform price', async ({ page }) => {
  await page.goto(
    `http://127.0.0.1:3039/c/services/${service}?tenant=${slug}&source=consumer:storefront`,
  );
  await expect(page.getByRole('heading', { name: '尊享定制服务' })).toBeVisible();
  await expect(page.locator('section[aria-label="商品信息"]')).toBeVisible();
  await expect(page.getByText('全平台团购价格', { exact: true })).toBeVisible();
  await expect(page.getByText('美团团购', { exact: true })).toBeVisible();
  await expect(page.getByText('¥199', { exact: true })).toBeVisible();
  await expect(page.getByText('商品详情', { exact: true })).toBeVisible();
  await expect(page.getByText('购买须知', { exact: true })).toBeVisible();
  await expect(page.getByText('门店资料', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '去购买', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('已记录');
  await page.screenshot({
    path: 'evidence/CONSUMER-COMMERCIAL-HOME-V1/service-detail-mobile.png',
    fullPage: true,
  });
});

test('consumer service detail shows unavailable', async ({ page }) => {
  await page.goto(
    'http://127.0.0.1:3039/c/services/00000000-0000-4000-8000-000000000000?tenant=missing-service',
  );
  await expect(page.getByRole('heading', { name: '商品暂不可访问' })).toBeVisible();
  await page.screenshot({
    path: 'evidence/CONSUMER-COMMERCIAL-HOME-V1/service-detail-forbidden.png',
    fullPage: true,
  });
});
