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
const base = 'http://127.0.0.1:3081';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3081',
    DATABASE_URL: db,
    AUTH_TOKEN_SECRET: 'management-crm-rfm-360',
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
test('G1-W∞-109: CRM RFM auto-layering + batch tagging round-trips with real DB', async () => {
  await ready();
  const client = new Client({ connectionString: db });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const organization = randomUUID();
  const owner = { user: randomUUID(), membership: randomUUID(), employee: randomUUID() };
  const customerA = randomUUID();
  const customerB = randomUUID();
  const customerC = randomUUID();
  const taskA = randomUUID();
  try {
    await client.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,'CRM org','team','active',null,null)",
      [organization, tenant, `crm-${stamp}`],
    );
    await client.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
      [owner.user, `CRMOWN-${stamp}@example.test`, 'CRM owner'],
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
      [owner.employee, tenant, owner.membership, organization, `CRME-${stamp}`],
    );
    for (const customer of [customerA, customerB, customerC]) {
      await client.query(
        "insert into customers(id,tenant_id,display_name,status,created_by,updated_by) values($1,$2,'CRM customer','active',null,null)",
        [customer, tenant],
      );
    }
    // Customer B has recent, frequent, high-reach interaction -> high-value layer.
    await client.query(
      "insert into tasks(id,tenant_id,customer_id,assignee_employee_id,title,reason,due_at,status,created_by,updated_by) values($1,$2,$3,$4,'Follow up B','Trace',now()-interval '1 day','done',null,null)",
      [taskA, tenant, customerB, owner.employee],
    );
    await client.query(
      "insert into task_follow_ups(id,tenant_id,task_id,employee_id,action_type,summary,created_by,updated_by) values($1,$2,$3,$4,'call','B recent follow-up',null,null)",
      [randomUUID(), tenant, taskA, owner.employee],
    );
    await client.query(
      "insert into customer_orders(id,tenant_id,customer_id,order_number,occurred_at,status,source,amount_cents,currency,fulfillment_status,created_by,updated_by) values($1,$2,$3,$4,now()-interval '3 day','active','campaign','0','CNY','active',null,null)",
      [randomUUID(), tenant, customerB, `BO-${stamp}`],
    );
    for (const role of ['campaign', 'employee_share', 'one_code']) {
      await client.query(
        "insert into customer_sources(id,tenant_id,customer_id,source_role,source_type,status,created_by,updated_by) values($1,$2,$3,$4,$4,'active',null,null)",
        [randomUUID(), tenant, customerA, role],
      );
    }
    const ownerToken = await login(`CRMOWN-${stamp}@example.test`);
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/customers/tags/batch`, {
          method: 'POST',
          headers: headers(ownerToken, {
            'x-tenant-context': randomUUID(),
            'x-request-id': randomUUID(),
          }),
          body: JSON.stringify({ action: 'add', label: 'x', customerIds: [customerA] }),
        })
      ).status,
      403,
    );
    const compute = await fetch(`${base}/api/v1/management/customers/rfm/compute`, {
      method: 'POST',
      headers: headers(ownerToken, { 'x-request-id': randomUUID() }),
      body: '{}',
    });
    assert.equal(compute.status, 201);
    const computed = (await compute.json()).data;
    assert.equal(computed.windowDays, 90);
    assert.ok(computed.total >= 3, 'RFM computed for seeded customers');
    assert.ok(computed.layers['沉睡'] !== undefined);

    // list exposes rfm layer for each customer
    const list = await fetch(`${base}/api/v1/management/customers`, {
      headers: headers(ownerToken),
    });
    assert.equal(list.status, 200);
    const rows = (await list.json()).data;
    const a = rows.find((row) => row.id === customerA);
    assert.ok(a, 'customer A listed');
    assert.ok(a.rfm, 'customer A has rfm');
    assert.equal(a.rfm.layer, '沉睡'); // multi-source reach but no recency/frequency

    // filter by rfm layer
    const filtered = await fetch(
      `${base}/api/v1/management/customers?layer=${encodeURIComponent('沉睡')}`,
      { headers: headers(ownerToken) },
    );
    assert.equal(filtered.status, 200);
    const filteredRows = (await filtered.json()).data;
    assert.ok(filteredRows.every((row) => row.rfm?.layer === '沉睡'));

    // batch tag add
    const tagKey = randomUUID();
    const tag = await fetch(`${base}/api/v1/management/customers/tags/batch`, {
      method: 'POST',
      headers: headers(ownerToken, {
        'idempotency-key': tagKey,
        'x-request-id': randomUUID(),
      }),
      body: JSON.stringify({
        action: 'add',
        label: 'W109-VIP',
        customerIds: [customerA, customerB],
      }),
    });
    assert.equal(tag.status, 201);
    assert.equal((await tag.json()).data.applied, 2);

    // idempotency replay (same key returns without double-apply error)
    const replay = await fetch(`${base}/api/v1/management/customers/tags/batch`, {
      method: 'POST',
      headers: headers(ownerToken, {
        'idempotency-key': tagKey,
        'x-request-id': randomUUID(),
      }),
      body: JSON.stringify({
        action: 'add',
        label: 'W109-VIP',
        customerIds: [customerA, customerB],
      }),
    });
    assert.equal(replay.status, 201);
    assert.equal((await replay.json()).data.applied, 2);

    // tag add reflected in list tags
    const afterTag = await fetch(`${base}/api/v1/management/customers`, {
      headers: headers(ownerToken),
    });
    const afterTagRows = (await afterTag.json()).data;
    assert.ok(
      afterTagRows.find((row) => row.id === customerA).tags.includes('W109-VIP'),
      'tag applied to customer A',
    );

    // batch tag remove
    const remove = await fetch(`${base}/api/v1/management/customers/tags/batch`, {
      method: 'POST',
      headers: headers(ownerToken, {
        'idempotency-key': randomUUID(),
        'x-request-id': randomUUID(),
      }),
      body: JSON.stringify({
        action: 'remove',
        label: 'W109-VIP',
        customerIds: [customerA],
      }),
    });
    assert.equal(remove.status, 201);
    assert.equal((await remove.json()).data.applied, 1);

    // detail returns rfm + follow_ups timeline
    const detail = await fetch(`${base}/api/v1/management/customers/${customerB}`, {
      headers: headers(ownerToken),
    });
    assert.equal(detail.status, 200);
    const d = (await detail.json()).data;
    assert.equal(d.follow_ups.length >= 1, true, 'detail exposes follow-up interaction');
    assert.ok(d.rfm && d.rfm.recencyDays !== undefined, 'detail exposes rfm');

    // audit + outbox written for RFM compute
    const audit = await client.query(
      "select count(*)::int as c from audit_logs where tenant_id=$1 and action='customer.rfm_computed'",
      [tenant],
    );
    assert.ok(audit.rows[0].c >= 1, 'audit written for rfm compute');
    const outbox = await client.query(
      "select count(*)::int as c from outbox_events where tenant_id=$1 and event_type='customer.rfm.computed.v1'",
      [tenant],
    );
    assert.ok(outbox.rows[0].c >= 1, 'outbox written for rfm compute');
  } finally {
    await client.end();
  }
});
