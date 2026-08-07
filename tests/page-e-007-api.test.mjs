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
const base = 'http://127.0.0.1:3072';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3072', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'page-e-007-api' },
  stdio: 'ignore',
});
const headers = (token, extra = {}) => ({
  authorization: `Bearer ${token}`,
  'content-type': 'application/json',
  'x-request-id': randomUUID(),
  ...extra,
});
async function ready() {
  for (let i = 0; i < 30; i += 1) {
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
test('employee nurture workbench scopes segments and persists touchpoints with tasks', async () => {
  await ready();
  const client = new Client({ connectionString: db });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const org = randomUUID();
  const owner = {
    user: randomUUID(),
    membership: randomUUID(),
    employee: randomUUID(),
    email: `nurture-owner-${stamp}@example.test`,
  };
  const peer = {
    user: randomUUID(),
    membership: randomUUID(),
    employee: randomUUID(),
    email: `nurture-peer-${stamp}@example.test`,
  };
  const customers = [randomUUID(), randomUUID(), randomUUID()];
  const profiles = [randomUUID(), randomUUID(), randomUUID()];
  try {
    await client.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,'Nurture org','team','active',null,null)",
      [org, tenant, `nurture-${stamp}`],
    );
    for (const [person, name, code] of [
      [owner, 'Nurture owner', 'OWNER'],
      [peer, 'Nurture peer', 'PEER'],
    ]) {
      await client.query(
        "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
        [person.user, person.email, name],
      );
      await client.query(
        "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
        [person.membership, tenant, person.user],
      );
      await client.query(
        "insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,'00000000-0000-4000-8000-000000000004')",
        [randomUUID(), tenant, person.membership],
      );
      await client.query(
        "insert into employees(id,tenant_id,membership_id,organization_id,employee_code,title,status,created_by,updated_by) values($1,$2,$3,$4,$5,'Advisor','active',null,null)",
        [person.employee, tenant, person.membership, org, `${code}-${stamp}`],
      );
    }
    for (let index = 0; index < customers.length; index += 1) {
      await client.query(
        "insert into customers(id,tenant_id,display_name,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
        [customers[index], tenant, `Nurture customer ${index + 1}`],
      );
    }
    await client.query(
      "insert into employee_nurture_profiles(id,tenant_id,customer_id,employee_id,segment,next_touch_at,created_by,updated_by) values($1,$2,$3,$4,'repurchase',now()+interval '1 day',null,null),($5,$2,$6,$4,'dormant',now()+interval '2 days',null,null),($7,$2,$8,$9,'active',now()+interval '3 days',null,null)",
      [
        profiles[0],
        tenant,
        customers[0],
        owner.employee,
        profiles[1],
        customers[1],
        profiles[2],
        customers[2],
        peer.employee,
      ],
    );
    await client.query(
      "insert into customer_orders(id,tenant_id,customer_id,order_number,occurred_at,created_by,updated_by) values($1,$2,$3,$4,now()-interval '15 days',null,null)",
      [randomUUID(), tenant, customers[0], `NURTURE-${stamp}`],
    );
    const token = await login(owner.email);
    assert.equal(
      (
        await fetch(`${base}/api/v1/employee/nurture`, {
          headers: { 'x-request-id': randomUUID() },
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/employee/nurture`, {
          headers: headers(token, { 'x-tenant-context': randomUUID() }),
        })
      ).status,
      403,
    );
    const list = await fetch(`${base}/api/v1/employee/nurture`, { headers: headers(token) });
    assert.equal(list.status, 200);
    const initial = (await list.json()).data;
    assert.equal(initial.filter((item) => customers.includes(item.customerId)).length, 2);
    assert.ok(initial.find((item) => item.customerId === customers[0]).lastOrderAt);
    const filtered = await fetch(`${base}/api/v1/employee/nurture?segment=dormant`, {
      headers: headers(token),
    });
    assert.equal(filtered.status, 200);
    assert.equal(
      (await filtered.json()).data.some((item) => item.customerId === customers[1]),
      true,
    );
    assert.equal(
      (await fetch(`${base}/api/v1/employee/nurture?segment=bad`, { headers: headers(token) }))
        .status,
      400,
    );
    const updateKey = `segment-${stamp}`;
    const update = () =>
      fetch(`${base}/api/v1/employee/nurture/${customers[0]}`, {
        method: 'PATCH',
        headers: headers(token, { 'idempotency-key': updateKey }),
        body: JSON.stringify({
          version: 1,
          segment: 'dormant',
          nextTouchAt: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
    const updatedResponse = await update();
    assert.equal(updatedResponse.status, 200);
    const updated = (await updatedResponse.json()).data;
    assert.equal(updated.segment, 'dormant');
    const replay = await update();
    assert.deepEqual((await replay.json()).data, updated);
    assert.equal(
      (
        await fetch(`${base}/api/v1/employee/nurture/${customers[0]}`, {
          method: 'PATCH',
          headers: headers(token, { 'idempotency-key': `stale-${stamp}` }),
          body: JSON.stringify({ version: 1, segment: 'active' }),
        })
      ).status,
      409,
    );
    const touchKey = `touch-${stamp}`;
    const touch = () =>
      fetch(`${base}/api/v1/employee/nurture/${customers[0]}/touchpoints`, {
        method: 'POST',
        headers: headers(token, { 'idempotency-key': touchKey }),
        body: JSON.stringify({
          version: updated.version,
          actionType: 'message',
          note: 'Checked in after purchase',
        }),
      });
    const touchedResponse = await touch();
    assert.equal(touchedResponse.status, 201);
    const touched = (await touchedResponse.json()).data;
    assert.equal(touched.touchpoint.actionType, 'message');
    assert.deepEqual((await (await touch()).json()).data, touched);
    const tasked = await fetch(`${base}/api/v1/employee/nurture/${customers[0]}/touchpoints`, {
      method: 'POST',
      headers: headers(token, { 'idempotency-key': `task-${stamp}` }),
      body: JSON.stringify({
        version: touched.version,
        actionType: 'call',
        note: 'Schedule premium renewal call',
        createTask: true,
        taskTitle: 'Renewal call',
        dueAt: new Date(Date.now() + 86400000).toISOString(),
      }),
    });
    assert.equal(tasked.status, 201);
    const taskedData = (await tasked.json()).data;
    assert.ok(taskedData.taskId);
    assert.equal(
      (
        await fetch(`${base}/api/v1/employee/nurture/${customers[2]}`, {
          method: 'PATCH',
          headers: headers(token, { 'idempotency-key': `peer-${stamp}` }),
          body: JSON.stringify({ version: 1, segment: 'dormant' }),
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/employee/nurture/${customers[0]}/touchpoints`, {
          method: 'POST',
          headers: headers(token, { 'idempotency-key': `invalid-${stamp}` }),
          body: JSON.stringify({ version: taskedData.version, actionType: 'invalid' }),
        })
      ).status,
      400,
    );
    const proof = await client.query(
      "select (select count(*) from employee_nurture_touchpoints where tenant_id=$1 and profile_id=$2)::int as touchpoints,(select count(*) from tasks where tenant_id=$1 and id=$3)::int as tasks,(select count(*) from audit_logs where tenant_id=$1 and resource_id=$4 and action like 'employee.nurture_%')::int as audits,(select count(*) from outbox_events where tenant_id=$1 and aggregate_id=$4 and event_type like 'employee.nurture_%')::int as outbox",
      [tenant, profiles[0], taskedData.taskId, customers[0]],
    );
    assert.deepEqual(proof.rows[0], { touchpoints: 2, tasks: 1, audits: 3, outbox: 3 });
  } finally {
    await client.end();
  }
});
