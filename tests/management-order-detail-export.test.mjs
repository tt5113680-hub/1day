/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const tenant = '00000000-0000-4000-8000-000000000001';
const base = 'http://127.0.0.1:3085';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3085',
    DATABASE_URL: db,
    AUTH_TOKEN_SECRET: 'management-order-detail-113',
  },
  stdio: 'ignore',
});
const headers = (token, extra = {}) => ({
  authorization: `Bearer ${token}`,
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
test('G1-W113: order trace detail + export with real DB', async () => {
  await ready();
  const client = new Client({ connectionString: db });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const organization = randomUUID();
  const owner = { user: randomUUID(), membership: randomUUID(), employee: randomUUID() };
  const merchant = randomUUID();
  const store = randomUUID();
  const customer = randomUUID();
  const order = randomUUID();
  const orderNumber = `OD-113-${stamp}`;
  try {
    await client.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,$4,'team','active',null,null)",
      [organization, tenant, `od-org-${stamp}`, `Order org ${stamp}`],
    );
    await client.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
      [owner.user, `ODOWN113-${stamp}@example.test`, 'Order owner'],
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
      [owner.employee, tenant, owner.membership, organization, `ODE113-${stamp}`],
    );
    await client.query(
      "insert into merchants(id,tenant_id,organization_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,$5,'active',null,null)",
      [merchant, tenant, organization, `ODM113-${stamp}`, `W113 merchant ${stamp}`],
    );
    await client.query(
      "insert into stores(id,tenant_id,organization_id,merchant_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,$5,$6,'active',null,null)",
      [store, tenant, organization, merchant, `OD-B113-${stamp}`, `Base store ${stamp}`],
    );
    await client.query(
      "insert into customers(id,tenant_id,display_name,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [customer, tenant, `Order customer ${stamp}`],
    );
    // customer_sources link (Consult source trace)
    await client.query(
      "insert into customer_sources(id,tenant_id,customer_id,source_role,source_type,source_id,status,created_by,updated_by) values($1,$2,$3,'consult','引导咨询','consult-113','active',null,null)",
      [randomUUID(), tenant, customer],
    );
    // task chained to the customer (Consult -> Task -> Done)
    await client.query(
      `insert into tasks(id,tenant_id,customer_id,assignee_employee_id,title,due_at,status,escalation_level,created_by,updated_by)
       values($1,$2,$3,$4,$5,now()+interval '1 day','open',0,null,null)`,
      [randomUUID(), tenant, customer, owner.employee, `Follow-up ${stamp}`],
    );
    // local order trace record on the store + customer
    await client.query(
      `insert into customer_orders(id,tenant_id,customer_id,order_number,occurred_at,status,store_id,source,amount_cents,currency,fulfillment_status,items,merchant_note,created_by,updated_by)
       values($1,$2,$3,$4,now(),'active',$5,'local',8800,'CNY','fulfilled',jsonb_build_array(jsonb_build_object('name', '团购套餐', 'qty', 1)),$6,null,null)`,
      [order, tenant, customer, orderNumber, store, '本地试点备注'],
    );

    const ownerToken = await login(`ODOWN113-${stamp}@example.test`);

    // cross-tenant guard on detail (no leak)
    const guarded = await fetch(`${base}/api/v1/management/commerce/orders/${order}`, {
      headers: headers(ownerToken, { 'x-tenant-context': randomUUID() }),
    });
    assert.ok([403, 404].includes(guarded.status), 'wrong tenant denied (403/404, no leak)');

    // detail returns order + source + task chain
    const detailResp = await fetch(`${base}/api/v1/management/commerce/orders/${order}`, {
      headers: headers(ownerToken),
    });
    assert.equal(detailResp.status, 200, `detail failed: ${await detailResp.clone().text()}`);
    const detail = (await detailResp.json()).data;
    assert.equal(detail.order.order_number, orderNumber);
    assert.equal(detail.order.store_name, `Base store ${stamp}`);
    assert.equal(detail.order.customer_name, `Order customer ${stamp}`);
    assert.equal(String(detail.order.amount_cents), '8800');
    assert.equal(detail.order.fulfillment_status, 'fulfilled');
    assert.ok(detail.sources.length >= 1, 'source chain present');
    assert.equal(detail.sources[0].source_role, 'consult');
    assert.ok(detail.tasks.length >= 1, 'task chain present');
    assert.ok(
      detail.tasks.some((t) => t.title === `Follow-up ${stamp}`),
      'task linked to customer',
    );
    assert.ok(Array.isArray(detail.audits), 'audit chain array present');

    // export returns real CSV containing the trace row
    const exportResp = await fetch(`${base}/api/v1/management/commerce/orders/export`, {
      headers: headers(ownerToken),
    });
    assert.equal(exportResp.status, 200);
    const csv = await exportResp.text();
    assert.ok(csv.includes('order_number,customer_name,store_name'), 'CSV header present');
    assert.ok(csv.includes(orderNumber), 'CSV contains order row');
    assert.ok(csv.includes('团购套餐'), 'CSV contains item name');
    assert.ok(csv.includes('8800'), 'CSV contains amount');

    // lower-privilege denial: no permissions -> forbidden
    const forbidden = await fetch(`${base}/api/v1/management/commerce/orders/${order}`, {
      headers: headers('invalid-token'),
    });
    assert.ok([401, 403].includes(forbidden.status), 'no auth denied (401/403)');
  } finally {
    await client.end();
  }
});
