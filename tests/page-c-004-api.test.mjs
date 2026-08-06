/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test',
  tenant = '00000000-0000-4000-8000-000000000001',
  base = 'http://127.0.0.1:3037';
const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3037', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'page-c-004-api' },
  stdio: 'ignore',
});
const request = (path, options) => fetch(base + path, options);
async function ready() {
  for (let i = 0; i < 30; i += 1) {
    try {
      if ((await request('/api/v1/health')).ok) return;
    } catch {
      /* starting */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error('API not ready');
}
test.after(() => api.kill());
test('consumer service detail preserves store, benefit and action boundaries', async () => {
  await ready();
  const stamp = Date.now(),
    c = new Client({ connectionString: db });
  await c.connect();
  const merchant = randomUUID(),
    store = randomUUID(),
    action = randomUUID(),
    service = randomUUID();
  try {
    const org = (
      await c.query("select id from organizations where tenant_id=$1 and status='active' limit 1", [
        tenant,
      ])
    ).rows[0]?.id;
    assert.ok(org);
    await c.query(
      "insert into merchants(id,tenant_id,organization_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,'服务商户','active',null,null)",
      [merchant, tenant, org, `svc-merchant-${stamp}`],
    );
    await c.query(
      "insert into stores(id,tenant_id,organization_id,merchant_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,$5,'服务体验门店','active',null,null)",
      [store, tenant, org, merchant, `svc-store-${stamp}`],
    );
    await c.query(
      "insert into external_actions(id,tenant_id,code,name,action_type,platform,status,created_by,updated_by) values($1,$2,$3,'立即咨询','platform_entry','web','active',null,null)",
      [action, tenant, `svc-action-${stamp}`],
    );
    await c.query(
      "insert into store_services(id,tenant_id,store_id,code,name,description,price_label,status,created_by,updated_by) values($1,$2,$3,$4,'定制服务','先评估再安排','¥299 起','active',null,null)",
      [service, tenant, store, `svc-${stamp}`],
    );
    await c.query(
      "insert into store_benefits(id,tenant_id,store_id,title,description,external_action_id,status,created_by,updated_by) values($1,$2,$3,'服务专属权益','完成咨询后发放',$4,'active',null,null)",
      [randomUUID(), tenant, store, action],
    );
    await c.query(
      "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,'服务隔离商户','active',null,null)",
      [randomUUID(), `service-isolated-${stamp}`],
    );
  } finally {
    await c.end();
  }
  const detail = await request(`/api/v1/consumer/services/${service}?tenant=system`);
  assert.equal(detail.status, 200);
  const data = (await detail.json()).data;
  assert.equal(data.service.name, '定制服务');
  assert.equal(data.store.name, '服务体验门店');
  assert.equal(data.benefits[0].title, '服务专属权益');
  const key = `service-open-${stamp}`;
  const open = () =>
    request(`/api/v1/consumer/services/${service}/actions/${action}/open?tenant=system`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': key },
      body: JSON.stringify({ source: 'service:detail' }),
    });
  assert.equal((await open()).status, 201);
  assert.equal((await (await open()).json()).data.replayed, true);
  assert.equal(
    (await request(`/api/v1/consumer/services/${service}?tenant=service-isolated-${stamp}`)).status,
    404,
  );
  assert.equal((await request('/api/v1/consumer/services/not-a-uuid?tenant=system')).status, 400);
});
