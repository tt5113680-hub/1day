/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const tenant = '00000000-0000-4000-8000-000000000001';
const base = 'http://127.0.0.1:3034';
const requireFromApi = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { Client } = requireFromApi('pg');
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3034', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'page-c-003-api' },
  stdio: 'ignore',
});
const request = (path, options) => fetch(base + path, options);
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

test('consumer store detail is tenant-scoped and consultation traces are idempotent', async () => {
  await ready();
  const stamp = Date.now();
  const client = new Client({ connectionString: db });
  await client.connect();
  const merchant = randomUUID(),
    store = randomUUID(),
    action = randomUUID();
  try {
    const organization = (
      await client.query(
        "select id from organizations where tenant_id=$1 and status='active' limit 1",
        [tenant],
      )
    ).rows[0]?.id;
    assert.ok(organization);
    await client.query(
      "insert into merchants(id,tenant_id,organization_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,$5,'active',null,null)",
      [merchant, tenant, organization, `detail-merchant-${stamp}`, '详情门店商户'],
    );
    await client.query(
      "insert into stores(id,tenant_id,organization_id,merchant_id,code,name,address,status,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,'active',null,null)",
      [
        store,
        tenant,
        organization,
        merchant,
        `detail-store-${stamp}`,
        '详情体验门店',
        '南京西路 88 号',
      ],
    );
    await client.query(
      "insert into external_actions(id,tenant_id,code,name,action_type,target_url,platform,status,created_by,updated_by) values($1,$2,$3,$4,'link',$5,'web','active',null,null)",
      [action, tenant, `detail-action-${stamp}`, '预约咨询', 'https://example.com/consult'],
    );
    await client.query(
      "insert into store_services(id,tenant_id,store_id,code,name,description,duration_minutes,price_label,rank,status,created_by,updated_by) values($1,$2,$3,$4,$5,$6,60,$7,1,'active',null,null)",
      [
        randomUUID(),
        tenant,
        store,
        `service-${stamp}`,
        '深度体验服务',
        '一对一体验与方案建议',
        '¥199 起',
      ],
    );
    await client.query(
      "insert into store_benefits(id,tenant_id,store_id,title,description,external_action_id,rank,status,created_by,updated_by) values($1,$2,$3,$4,$5,$6,1,'active',null,null)",
      [randomUUID(), tenant, store, '新客专享礼', '咨询后可领取到店礼', action],
    );
    await client.query(
      "insert into store_content_items(id,tenant_id,store_id,content_type,title,summary,rank,status,created_by,updated_by) values($1,$2,$3,'story',$4,$5,1,'active',null,null)",
      [randomUUID(), tenant, store, '为什么值得到店', '从预约到到店都有清晰安排'],
    );
    await client.query(
      "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [randomUUID(), `store-isolated-${stamp}`, 'Store isolated'],
    );
  } finally {
    await client.end();
  }
  const detail = await request(`/api/v1/consumer/stores/${store}?tenant=system`);
  assert.equal(detail.status, 200);
  const data = (await detail.json()).data;
  assert.equal(data.store.name, '详情体验门店');
  assert.equal(data.services[0].name, '深度体验服务');
  assert.equal(data.benefits[0].title, '新客专享礼');
  assert.equal(data.content[0].title, '为什么值得到店');
  assert.equal(
    data.actions.some((item) => item.id === action),
    true,
  );
  const key = `consumer-open-${stamp}`;
  const open = (options) =>
    request(`/api/v1/consumer/stores/${store}/actions/${action}/open?tenant=system`, options);
  const first = await open({
    method: 'POST',
    headers: { 'content-type': 'application/json', 'idempotency-key': key },
    body: JSON.stringify({ source: 'discovery:weekend' }),
  });
  assert.equal(first.status, 201);
  const created = (await first.json()).data;
  assert.equal(created.replayed, false);
  const replay = await open({
    method: 'POST',
    headers: { 'content-type': 'application/json', 'idempotency-key': key },
    body: JSON.stringify({ source: 'discovery:weekend' }),
  });
  assert.equal(replay.status, 201);
  assert.equal((await replay.json()).data.eventId, created.eventId);
  const verify = new Client({ connectionString: db });
  await verify.connect();
  try {
    assert.equal(
      (
        await verify.query(
          'select count(*)::int as count from consumer_action_events where tenant_id=$1 and idempotency_key=$2',
          [tenant, key],
        )
      ).rows[0].count,
      1,
    );
    assert.equal(
      (
        await verify.query(
          "select count(*)::int as count from audit_logs where tenant_id=$1 and resource_id=$2 and action='consumer.action_opened'",
          [tenant, created.eventId],
        )
      ).rows[0].count,
      1,
    );
    assert.equal(
      (
        await verify.query(
          "select count(*)::int as count from outbox_events where tenant_id=$1 and aggregate_id=$2 and event_type='consumer.action.clicked.v1'",
          [tenant, created.eventId],
        )
      ).rows[0].count,
      1,
    );
  } finally {
    await verify.end();
  }
  assert.equal(
    (await request(`/api/v1/consumer/stores/${store}?tenant=store-isolated-${stamp}`)).status,
    404,
  );
  assert.equal((await request('/api/v1/consumer/stores/not-a-uuid?tenant=system')).status, 400);
  assert.equal(
    (await open({ method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }))
      .status,
    400,
  );
});
