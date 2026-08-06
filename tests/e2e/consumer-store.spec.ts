import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { Client } from '../../apps/api/node_modules/pg/esm/index.mjs';
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const stamp = Date.now();
const tenantId = randomUUID();
const org = randomUUID();
const merchant = randomUUID();
const store = randomUUID();
const action = randomUUID();
const slug = `store-browser-${stamp}`;
test.beforeAll(async () => {
  const c = new Client({ connectionString: db });
  await c.connect();
  try {
    await c.query(
      "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,'门店浏览器商户','active',null,null)",
      [tenantId, slug],
    );
    await c.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,'门店浏览器组织','enterprise','active',null,null)",
      [org, tenantId, `org-${stamp}`],
    );
    await c.query(
      "insert into merchants(id,tenant_id,organization_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,'门店商户','active',null,null)",
      [merchant, tenantId, org, `merchant-${stamp}`],
    );
    await c.query(
      "insert into stores(id,tenant_id,organization_id,merchant_id,code,name,address,status,created_by,updated_by) values($1,$2,$3,$4,$5,'城市体验门店','人民广场 18 号','active',null,null)",
      [store, tenantId, org, merchant, `store-${stamp}`],
    );
    await c.query(
      "insert into external_actions(id,tenant_id,code,name,action_type,platform,status,created_by,updated_by) values($1,$2,$3,'预约咨询','platform_entry','web','active',null,null)",
      [action, tenantId, `action-${stamp}`],
    );
    await c.query(
      "insert into store_services(id,tenant_id,store_id,code,name,description,duration_minutes,price_label,status,created_by,updated_by) values($1,$2,$3,$4,'深度体验服务','一对一体验建议',60,'¥199 起','active',null,null)",
      [randomUUID(), tenantId, store, `service-${stamp}`],
    );
    await c.query(
      "insert into store_benefits(id,tenant_id,store_id,title,description,external_action_id,status,created_by,updated_by) values($1,$2,$3,'新客专享礼','咨询即可领取到店礼',$4,'active',null,null)",
      [randomUUID(), tenantId, store, action],
    );
    await c.query(
      "insert into store_content_items(id,tenant_id,store_id,content_type,title,summary,status,created_by,updated_by) values($1,$2,$3,'story','为什么值得到店','服务与安排已经准备好','active',null,null)",
      [randomUUID(), tenantId, store],
    );
  } finally {
    await c.end();
  }
});
test('consumer store detail renders real content and records a consultation', async ({ page }) => {
  await page.goto(
    `http://127.0.0.1:3036/c/stores/${store}?tenant=${slug}&source=discovery:weekend`,
  );
  await expect(page.getByRole('heading', { name: '城市体验门店' })).toBeVisible();
  await expect(page.getByText('深度体验服务')).toBeVisible();
  await expect(page.getByText('新客专享礼')).toBeVisible();
  await page.getByRole('button', { name: '预约咨询' }).click();
  await expect(page.getByRole('status')).toContainText('咨询意向已记录');
  await page.screenshot({ path: 'evidence/PAGE-C-003/consumer-store-mobile.png', fullPage: true });
  const c = new Client({ connectionString: db });
  await c.connect();
  try {
    expect(
      (
        await c.query(
          'select count(*)::int as count from consumer_action_events where tenant_id=$1 and store_id=$2',
          [tenantId, store],
        )
      ).rows[0].count,
    ).toBe(1);
  } finally {
    await c.end();
  }
});
test('consumer store detail shows unavailable state', async ({ page }) => {
  await page.goto(
    'http://127.0.0.1:3036/c/stores/00000000-0000-4000-8000-000000000000?tenant=missing-store',
  );
  await expect(page.getByRole('heading', { name: '门店暂不可访问' })).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-C-003/consumer-store-forbidden.png',
    fullPage: true,
  });
});
