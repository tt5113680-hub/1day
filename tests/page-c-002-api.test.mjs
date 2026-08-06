/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test',
  tenant = '00000000-0000-4000-8000-000000000001',
  base = 'http://127.0.0.1:3029';
const requireFromApi = createRequire(new URL('../apps/api/package.json', import.meta.url)),
  { Client } = requireFromApi('pg');
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3029', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'page-c-002-api' },
  stdio: 'ignore',
});
const request = (path) => fetch(base + path);
async function ready() {
  for (let index = 0; index < 30; index += 1) {
    try {
      if ((await request('/api/v1/health')).ok) return;
    } catch {
      /* starting */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw Error('API not ready');
}
test.after(() => api.kill());
test('consumer discovery keeps channel, circle and LBS datasets tenant-scoped and separate', async () => {
  await ready();
  const stamp = Date.now(),
    client = new Client({ connectionString: db });
  await client.connect();
  const channelMerchant = randomUUID(),
    circleMerchant = randomUUID(),
    nearbyMerchant = randomUUID(),
    channel = randomUUID(),
    circle = randomUUID();
  try {
    const organization = (
      await client.query('select id from organizations where tenant_id=$1 and status=$2 limit 1', [
        tenant,
        'active',
      ])
    ).rows[0]?.id;
    assert.ok(organization);
    for (const [id, code, name] of [
      [channelMerchant, `channel-${stamp}`, '渠道精选商户'],
      [circleMerchant, `circle-${stamp}`, '商圈成员商户'],
      [nearbyMerchant, `nearby-${stamp}`, '附近位置商户'],
    ])
      await client.query(
        "insert into merchants(id,tenant_id,organization_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,$5,'active',null,null)",
        [id, tenant, organization, code, name],
      );
    await client.query(
      "insert into discovery_channels(id,tenant_id,code,name,description,rank,status,created_by,updated_by) values($1,$2,$3,$4,$5,10,'active',null,null)",
      [channel, tenant, `channel-${stamp}`, '周末精选', '渠道编辑推荐'],
    );
    await client.query(
      "insert into discovery_channel_merchants(id,tenant_id,channel_id,merchant_id,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null)",
      [randomUUID(), tenant, channel, channelMerchant],
    );
    await client.query(
      "insert into business_circles(id,tenant_id,code,name,description,rank,status,created_by,updated_by) values($1,$2,$3,$4,$5,10,'active',null,null)",
      [circle, tenant, `circle-${stamp}`, '城市体验圈', '商家主动加入的服务圈'],
    );
    await client.query(
      "insert into business_circle_merchants(id,tenant_id,business_circle_id,merchant_id,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null)",
      [randomUUID(), tenant, circle, circleMerchant],
    );
    await client.query(
      "insert into merchant_locations(id,tenant_id,merchant_id,latitude,longitude,address_label,status,created_by,updated_by) values($1,$2,$3,31.230400,121.473700,$4,'active',null,null)",
      [randomUUID(), tenant, nearbyMerchant, '人民广场附近'],
    );
    await client.query(
      "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [randomUUID(), `discovery-isolated-${stamp}`, 'Discovery isolated'],
    );
  } finally {
    await client.end();
  }
  const response = await request(
    '/api/v1/consumer/discovery?tenant=system&latitude=31.2304&longitude=121.4737',
  );
  assert.equal(response.status, 200);
  const data = (await response.json()).data;
  assert.equal(
    data.channels.some(
      (item) =>
        item.name === '周末精选' &&
        item.merchants.some((merchant) => merchant.name === '渠道精选商户'),
    ),
    true,
  );
  assert.equal(
    data.circles.some(
      (item) =>
        item.name === '城市体验圈' &&
        item.merchants.some((merchant) => merchant.name === '商圈成员商户'),
    ),
    true,
  );
  assert.equal(
    data.circles.some((item) =>
      item.merchants.some((merchant) => merchant.name === '渠道精选商户'),
    ),
    false,
  );
  assert.equal(
    data.nearby.some((item) => item.name === '附近位置商户' && item.distanceKm === 0),
    true,
  );
  assert.equal(
    (
      await (
        await request(
          `/api/v1/consumer/discovery?tenant=discovery-isolated-${stamp}&latitude=31.2304&longitude=121.4737`,
        )
      ).json()
    ).data.nearby.length,
    0,
  );
  assert.equal(
    (await request('/api/v1/consumer/discovery?tenant=system&latitude=31.2')).status,
    400,
  );
  assert.equal((await request('/api/v1/consumer/discovery?tenant=missing-discovery')).status, 404);
});
