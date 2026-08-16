/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';
import { URL } from 'node:url';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');
const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const tenant = '00000000-0000-4000-8000-000000000001';
const base = 'http://127.0.0.1:3078';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3078',
    DATABASE_URL: db,
    AUTH_TOKEN_SECRET: 'g1-winf136-store-compare-timeseries',
  },
  stdio: 'ignore',
});
const headers = (token, extra = {}) => ({
  authorization: `Bearer ${token}`,
  'content-type': 'application/json',
  'x-request-id': randomUUID(),
  ...extra,
});
async function ready() {
  for (let i = 0; i < 40; i += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      /* starting */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw Error('API did not start');
}
async function login(email) {
  const response = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'ChangeMe123!', tenantId: tenant }),
  });
  assert.equal(response.status, 201);
  return (await response.json()).accessToken;
}

test.after(() => api.kill());

test('G1-W136: controller/service/page expose store-compare + time-series', () => {
  const c = read('apps/api/src/management-commerce.controller.ts');
  const s = read('apps/api/src/management-commerce.service.ts');
  const p = read('apps/management-web/app/m/orders/page.tsx');
  const css = read('apps/management-web/app/m/_commerce.module.css');
  assert.match(c, /@Get\('orders\/insights'\)/);
  assert.match(c, /orderInsights/);
  assert.match(s, /async orderInsights/);
  assert.match(s, /storeCompare/);
  assert.match(s, /timeSeries/);
  assert.match(s, /validRate/);
  assert.match(s, /不接美团实时订单/);
  assert.match(p, /orders\/insights/);
  assert.match(p, /门店对比/);
  assert.match(p, /时间序列/);
  assert.match(p, /TREND_DAYS/);
  assert.match(p, /validRate/);
  assert.match(css, /\.detailRow/);
  assert.match(css, /\.detailValue/);
});

test('G1-W136: storeCompare + timeSeries with real DB and store scope', async () => {
  await ready();
  const client = new Client({ connectionString: db });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const organization = randomUUID();
  const owner = { user: randomUUID(), membership: randomUUID(), employee: randomUUID() };
  const merchant = randomUUID();
  const storeA = randomUUID();
  const storeB = randomUUID();
  const customer = randomUUID();
  const orderA1 = randomUUID();
  const orderA2 = randomUUID();
  const orderB1 = randomUUID();
  try {
    await client.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,$4,'team','active',null,null)",
      [organization, tenant, `w136-org-${stamp}`, `Orders136 org ${stamp}`],
    );
    await client.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
      [owner.user, `W136-${stamp}@example.test`, 'Orders136 owner'],
    );
    await client.query(
      "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [owner.membership, tenant, owner.user],
    );
    await client.query(
      'insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,$4)',
      [randomUUID(), tenant, owner.membership, '00000000-0000-4000-8000-000000000004'],
    );
    await client.query(
      "insert into employees(id,tenant_id,membership_id,organization_id,employee_code,title,status,created_by,updated_by) values($1,$2,$3,$4,$5,'Advisor','active',null,null)",
      [owner.employee, tenant, owner.membership, organization, `RVE136-${stamp}`],
    );
    await client.query(
      "insert into merchants(id,tenant_id,organization_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,$5,'active',null,null)",
      [merchant, tenant, organization, `w136-m-${stamp}`, `Orders136 merchant ${stamp}`],
    );
    await client.query(
      "insert into stores(id,tenant_id,organization_id,merchant_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,$5,$6,'active',null,null),($7,$2,$3,$4,$8,$9,'active',null,null)",
      [
        storeA,
        tenant,
        organization,
        merchant,
        `w136-sa-${stamp}`,
        `门店甲 ${stamp}`,
        storeB,
        `w136-sb-${stamp}`,
        `门店乙 ${stamp}`,
      ],
    );
    await client.query(
      "insert into customers(id,tenant_id,display_name,status,created_by,updated_by) values($1,$2,'订单对比顾客','active',null,null)",
      [customer, tenant],
    );
    await client.query(
      `insert into customer_orders(id,tenant_id,customer_id,store_id,order_number,occurred_at,status,source,amount_cents,currency,fulfillment_status,created_by,updated_by)
       values($1,$2,$3,$4,$5,now()-interval '1 day','active','local',15800,'CNY','paid',null,null),
             ($6,$2,$3,$4,$7,now()-interval '1 day','active','import_meituan',2000,'CNY','refunded',null,null),
             ($8,$2,$3,$9,$10,now()-interval '5 days','active','local',8900,'CNY','paid',null,null)`,
      [
        orderA1,
        tenant,
        customer,
        storeA,
        `WA1-${stamp}`,
        orderA2,
        `WA2-${stamp}`,
        orderB1,
        storeB,
        `WB1-${stamp}`,
      ],
    );

    const token = await login(`W136-${stamp}@example.test`);
    const insightsResp = await fetch(`${base}/api/v1/management/commerce/orders/insights?days=30`, {
      headers: headers(token),
    });
    assert.equal(insightsResp.status, 200);
    const insights = (await insightsResp.json()).data;
    assert.equal(insights.days, 30);
    assert.ok(Array.isArray(insights.storeCompare));
    assert.ok(Array.isArray(insights.timeSeries));
    const storeAInsight = insights.storeCompare.find((row) => row.storeId === storeA);
    const storeBInsight = insights.storeCompare.find((row) => row.storeId === storeB);
    assert.ok(storeAInsight, 'store A present in compare');
    assert.ok(storeBInsight, 'store B present in compare');
    assert.equal(storeAInsight.total, 2);
    assert.equal(storeAInsight.valid, 1);
    assert.equal(storeAInsight.validRate, 0.5);
    assert.equal(storeBInsight.total, 1);
    assert.equal(storeBInsight.valid, 1);
    assert.equal(storeAInsight.amountRef, '17800');
    assert.equal(storeBInsight.amountRef, '8900');
    assert.ok(Array.isArray(storeAInsight.sources));
    assert.ok(insights.timeSeries.length >= 1);
    assert.match(insights.disclaimer, /本地 customer_orders/);
    assert.match(insights.disclaimer, /不接美团实时订单/);

    const bad = await fetch(`${base}/api/v1/management/commerce/orders/insights?days=99`, {
      headers: headers(token),
    });
    assert.equal(bad.status, 400);

    const unauthorized = await fetch(`${base}/api/v1/management/commerce/orders/insights?days=30`, {
      headers: headers(token, { 'x-tenant-context': '00000000-0000-4000-8000-000000000099' }),
    });
    assert.equal(unauthorized.status, 403);
  } finally {
    await client
      .query('delete from customer_orders where id=any($1::uuid[])', [[orderA1, orderA2, orderB1]])
      .catch(() => undefined);
    await client
      .query('delete from auth_sessions where user_id=$1', [owner.user])
      .catch(() => undefined);
    await client
      .query('delete from stores where id=any($1::uuid[])', [[storeA, storeB]])
      .catch(() => undefined);
    await client.query('delete from customers where id=$1', [customer]).catch(() => undefined);
    await client.query('delete from merchants where id=$1', [merchant]).catch(() => undefined);
    await client
      .query('delete from employees where id=$1', [owner.employee])
      .catch(() => undefined);
    await client
      .query('delete from membership_roles where membership_id=$1', [owner.membership])
      .catch(() => undefined);
    await client
      .query('delete from memberships where id=$1', [owner.membership])
      .catch(() => undefined);
    await client.query('delete from users where id=$1', [owner.user]).catch(() => undefined);
    await client
      .query('delete from organizations where id=$1', [organization])
      .catch(() => undefined);
    await client.end();
  }
});
