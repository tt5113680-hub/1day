/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test',
  tenant = '00000000-0000-4000-8000-000000000001',
  otherTenant = '00000000-0000-4000-8000-000000000002',
  base = 'http://127.0.0.1:3091';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3091', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'page-m-commerce' },
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
  const r = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'ChangeMe123!', tenantId: tenant }),
  });
  assert.equal(r.status, 201);
  return (await r.json()).accessToken;
}
test.after(() => api.kill());
test('management commerce surfaces orders/reviews/marketing with tenant isolation', async () => {
  await ready();
  const c = new Client({ connectionString: db });
  await c.connect();
  const s = `${Date.now()}${Math.floor(Math.random() * 1000)}`,
    org = randomUUID(),
    owner = {
      user: randomUUID(),
      membership: randomUUID(),
      email: `com-${s}@example.test`,
    },
    viewer = {
      user: randomUUID(),
      membership: randomUUID(),
      email: `com-view-${s}@example.test`,
    },
    store = randomUUID(),
    customer = randomUUID(),
    order = randomUUID(),
    merchant = randomUUID();
  try {
    await c.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,'Commerce org','team','active',null,null)",
      [org, tenant, `commerce-${s}`],
    );
    await c.query(
      "insert into merchants(id,tenant_id,organization_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,'Commerce merchant','active',null,null)",
      [merchant, tenant, org, `M-${s}`],
    );
    await c.query(
      "insert into stores(id,tenant_id,organization_id,merchant_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,$5,'商单测试门店','active',null,null)",
      [store, tenant, org, merchant, `ST-${s}`],
    );
    await c.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,'Commerce owner',password_hash,'active',null,null from users where email='admin@system.local'",
      [owner.user, owner.email],
    );
    await c.query(
      "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [owner.membership, tenant, owner.user],
    );
    await c.query(
      "insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,'00000000-0000-4000-8000-000000000004')",
      [randomUUID(), tenant, owner.membership],
    );
    await c.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,'Commerce viewer',password_hash,'active',null,null from users where email='admin@system.local'",
      [viewer.user, viewer.email],
    );
    await c.query(
      "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [viewer.membership, tenant, viewer.user],
    );
    await c.query(
      "insert into customers(id,tenant_id,display_name,status,created_by,updated_by) values($1,$2,'商单顾客','active',null,null)",
      [customer, tenant],
    );
    await c.query(
      `insert into customer_orders(id,tenant_id,customer_id,store_id,order_number,occurred_at,status,source,amount_cents,currency,fulfillment_status,created_by,updated_by)
       values($1,$2,$3,$4,$5,now(),'active','local',15800,'CNY','paid',null,null)`,
      [order, tenant, customer, store, `COM-${s}`],
    );
    await c.query(
      `insert into store_reviews(id,tenant_id,store_id,customer_id,rating,content,reviewer_label,source,status,created_by,updated_by)
       values($1,$2,$3,$4,5,'体验很好','商单评价者','local','active',null,null)`,
      [randomUUID(), tenant, store, customer],
    );
    await c.query(
      `insert into marketing_campaigns(id,tenant_id,store_id,campaign_type,title,description,delivery_channel,starts_at,ends_at,status,created_by,updated_by)
       values($1,$2,$3,'coupon','商单测试券','TEST ONLY','local',now()-interval '1 day',now()+interval '7 days','live',null,null)`,
      [randomUUID(), tenant, store],
    );
    const token = await login(owner.email);
    const viewerToken = await login(viewer.email);

    const orders = await (
      await fetch(`${base}/api/v1/management/commerce/orders`, { headers: headers(token) })
    ).json();
    assert.equal(orders.data.some((o) => o.order_number === `COM-${s}`), true);
    assert.equal(orders.data.find((o) => o.order_number === `COM-${s}`)?.store_name, '商单测试门店');

    const reviews = await (
      await fetch(`${base}/api/v1/management/commerce/reviews`, { headers: headers(token) })
    ).json();
    assert.equal(reviews.data.some((r) => r.store_id === store && r.rating === 5), true);

    const marketing = await (
      await fetch(`${base}/api/v1/management/commerce/marketing`, { headers: headers(token) })
    ).json();
    assert.equal(marketing.data.some((m) => m.title === '商单测试券' && m.status === 'live'), true);

    const viewerOrders = await fetch(`${base}/api/v1/management/commerce/orders`, {
      headers: headers(viewerToken),
    });
    assert.equal(viewerOrders.status, 403);

    const wrongTenant = await fetch(`${base}/api/v1/management/commerce/orders`, {
      headers: headers(token, { 'x-tenant-context': otherTenant }),
    });
    assert.equal(wrongTenant.status, 403);
  } finally {
    await c.end();
  }
});
