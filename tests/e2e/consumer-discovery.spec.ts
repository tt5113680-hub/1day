import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { Client } from '../../apps/api/node_modules/pg/esm/index.mjs';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const stamp = Date.now();
const discoveryTenant = `discovery-browser-${stamp}`;
const emptyTenant = `discovery-empty-${stamp}`;
const discoveryTenantId = randomUUID();
const discoveryOrganizationId = randomUUID();
const channelMerchantName = `渠道精选商户-${stamp}`;
const circleMerchantName = `商圈成员商户-${stamp}`;
const nearbyMerchantName = `附近位置商户-${stamp}`;

test.beforeAll(async () => {
  const client = new Client({ connectionString: db });
  await client.connect();
  try {
    await client.query(
      "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [discoveryTenantId, discoveryTenant, '浏览器发现商户'],
    );
    await client.query(
      "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [randomUUID(), emptyTenant, '空发现商户'],
    );
    await client.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,$4,'enterprise','active',null,null)",
      [discoveryOrganizationId, discoveryTenantId, `browser-org-${stamp}`, '浏览器发现组织'],
    );
    const channelMerchant = randomUUID();
    const circleMerchant = randomUUID();
    const nearbyMerchant = randomUUID();
    for (const [id, code, name] of [
      [channelMerchant, `browser-channel-${stamp}`, channelMerchantName],
      [circleMerchant, `browser-circle-${stamp}`, circleMerchantName],
      [nearbyMerchant, `browser-nearby-${stamp}`, nearbyMerchantName],
    ])
      await client.query(
        "insert into merchants(id,tenant_id,organization_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,$5,'active',null,null)",
        [id, discoveryTenantId, discoveryOrganizationId, code, name],
      );
    const channel = randomUUID();
    await client.query(
      "insert into discovery_channels(id,tenant_id,code,name,description,rank,status,created_by,updated_by) values($1,$2,$3,$4,$5,0,'active',null,null)",
      [
        channel,
        discoveryTenantId,
        `browser-channel-${stamp}`,
        '周末精选',
        '由渠道运营配置的推荐内容',
      ],
    );
    await client.query(
      "insert into discovery_channel_merchants(id,tenant_id,channel_id,merchant_id,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null)",
      [randomUUID(), discoveryTenantId, channel, channelMerchant],
    );
    const circle = randomUUID();
    await client.query(
      "insert into business_circles(id,tenant_id,code,name,description,rank,status,created_by,updated_by) values($1,$2,$3,$4,$5,0,'active',null,null)",
      [
        circle,
        discoveryTenantId,
        `browser-circle-${stamp}`,
        '城市体验圈',
        '商家主动加入的固定服务圈',
      ],
    );
    await client.query(
      "insert into business_circle_merchants(id,tenant_id,business_circle_id,merchant_id,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null)",
      [randomUUID(), discoveryTenantId, circle, circleMerchant],
    );
    await client.query(
      "insert into merchant_locations(id,tenant_id,merchant_id,latitude,longitude,address_label,status,created_by,updated_by) values($1,$2,$3,31.230400,121.473700,$4,'active',null,null)",
      [randomUUID(), discoveryTenantId, nearbyMerchant, '人民广场附近'],
    );
  } finally {
    await client.end();
  }
});

test('consumer discovery renders independent channel, circle and LBS results on mobile', async ({
  page,
}) => {
  await page.goto(
    `http://127.0.0.1:3032/c/discovery?tenant=${discoveryTenant}&latitude=31.2304&longitude=121.4737`,
  );
  await expect(page.getByRole('heading', { name: '发现刚好适合你的去处' })).toBeVisible();
  await expect(page.getByText(channelMerchantName)).toBeVisible();
  await expect(page.getByText(circleMerchantName)).toBeVisible();
  await expect(page.getByText(nearbyMerchantName)).toBeVisible();
  await expect(page.getByText('仅按设备位置计算距离，不使用商圈成员关系。')).toBeVisible();
  await page.getByRole('button', { name: '附近商户', exact: true }).click();
  await expect(page.getByRole('heading', { name: '附近商户' })).toBeInViewport();
  await page.screenshot({
    path: 'evidence/PAGE-C-002/consumer-discovery-mobile.png',
    fullPage: true,
  });
});

test('consumer discovery exposes empty, location and unavailable states', async ({ page }) => {
  await page.goto(`http://127.0.0.1:3032/c/discovery?tenant=${emptyTenant}`);
  await expect(page.getByText('暂未配置渠道推荐。')).toBeVisible();
  await expect(page.getByRole('button', { name: '使用当前位置发现附近商户' })).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-C-002/consumer-discovery-empty.png',
    fullPage: true,
  });
  await page.goto('http://127.0.0.1:3032/c/discovery?tenant=missing-consumer-discovery');
  await expect(page.getByRole('heading', { name: '发现入口暂不可用' })).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-C-002/consumer-discovery-forbidden.png',
    fullPage: true,
  });
});
