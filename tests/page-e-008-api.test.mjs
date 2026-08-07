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
const base = 'http://127.0.0.1:3075';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3075', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'page-e-008-api' },
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
test('employee notifications materialize deduplicated task, anomaly and approval records with private reads', async () => {
  await ready();
  const client = new Client({ connectionString: db });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const organization = randomUUID();
  const owner = {
    user: randomUUID(),
    membership: randomUUID(),
    employee: randomUUID(),
    email: `notifications-owner-${stamp}@example.test`,
  };
  const peer = {
    user: randomUUID(),
    membership: randomUUID(),
    employee: randomUUID(),
    email: `notifications-peer-${stamp}@example.test`,
  };
  const customer = randomUUID();
  const task = randomUUID();
  const reminderLog = randomUUID();
  const overdueLog = randomUUID();
  const approval = randomUUID();
  const system = randomUUID();
  try {
    await client.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,'Notification org','team','active',null,null)",
      [organization, tenant, `notifications-${stamp}`],
    );
    for (const [person, name, code] of [
      [owner, 'Notification owner', 'OWNER'],
      [peer, 'Notification peer', 'PEER'],
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
        [person.employee, tenant, person.membership, organization, `${code}-${stamp}`],
      );
    }
    await client.query(
      "insert into customers(id,tenant_id,display_name,status,created_by,updated_by) values($1,$2,'Notification customer','active',null,null)",
      [customer, tenant],
    );
    await client.query(
      "insert into tasks(id,tenant_id,customer_id,assignee_employee_id,title,reason,due_at,created_by,updated_by) values($1,$2,$3,$4,'Call notification customer','Reminder proof',now()+interval '1 day',null,null)",
      [task, tenant, customer, owner.employee],
    );
    await client.query(
      "insert into notification_logs(id,tenant_id,task_id,employee_id,notification_type,created_by,updated_by) values($1,$2,$3,$4,'reminder',null,null),($5,$2,$3,$4,'overdue_escalation',null,null)",
      [reminderLog, tenant, task, owner.employee, overdueLog],
    );
    await client.query(
      "insert into customer_ownership_transfer_approvals(id,tenant_id,customer_id,from_employee_id,to_employee_id,reason,requested_version,created_by,updated_by) values($1,$2,$3,null,$4,'Ownership handoff',1,null,null)",
      [approval, tenant, customer, owner.employee],
    );
    await client.query(
      "insert into employee_notifications(id,tenant_id,employee_id,category,source_type,source_id,title,body,deep_link,created_by,updated_by) values($1,$2,$3,'system','test_system',$4,'System update','Notification center is ready','https://untrusted.example',null,null)",
      [randomUUID(), tenant, owner.employee, system],
    );
    const token = await login(owner.email);
    const peerToken = await login(peer.email);
    assert.equal(
      (
        await fetch(`${base}/api/v1/employee/notifications`, {
          headers: { 'x-request-id': randomUUID() },
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/employee/notifications`, {
          headers: headers(token, { 'x-tenant-context': randomUUID() }),
        })
      ).status,
      403,
    );
    const list = await fetch(`${base}/api/v1/employee/notifications`, { headers: headers(token) });
    assert.equal(list.status, 200);
    const initial = (await list.json()).data;
    assert.equal(initial.items.length, 4);
    assert.equal(initial.unreadCount, 4);
    assert.deepEqual(
      new Set(initial.items.map((item) => item.category)),
      new Set(['task', 'anomaly', 'approval', 'system']),
    );
    assert.equal(
      initial.items.find((item) => item.category === 'task').deepLink,
      `/e/tasks/${task}`,
    );
    assert.equal(
      initial.items.find((item) => item.category === 'approval').deepLink,
      `/e/customers/${customer}`,
    );
    assert.equal(
      initial.items.find((item) => item.category === 'system').deepLink,
      '/e/notifications',
    );
    const repeated = await fetch(`${base}/api/v1/employee/notifications`, {
      headers: headers(token),
    });
    assert.equal((await repeated.json()).data.items.length, 4);
    const unread = await fetch(`${base}/api/v1/employee/notifications?state=unread&category=task`, {
      headers: headers(token),
    });
    const taskNotification = (await unread.json()).data.items[0];
    assert.equal(taskNotification.category, 'task');
    assert.equal(
      (
        await fetch(`${base}/api/v1/employee/notifications?category=unknown`, {
          headers: headers(token),
        })
      ).status,
      400,
    );
    const key = `read-${stamp}`;
    const markRead = () =>
      fetch(`${base}/api/v1/employee/notifications/${taskNotification.id}/read`, {
        method: 'PATCH',
        headers: headers(token, { 'idempotency-key': key }),
        body: JSON.stringify({ version: taskNotification.version }),
      });
    const response = await markRead();
    assert.equal(response.status, 200);
    const read = (await response.json()).data;
    assert.ok(read.readAt);
    assert.equal(read.version, taskNotification.version + 1);
    assert.deepEqual((await (await markRead()).json()).data, read);
    assert.equal(
      (
        await fetch(`${base}/api/v1/employee/notifications/${taskNotification.id}/read`, {
          method: 'PATCH',
          headers: headers(token, { 'idempotency-key': `stale-${stamp}` }),
          body: JSON.stringify({ version: taskNotification.version }),
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/employee/notifications/${taskNotification.id}/read`, {
          method: 'PATCH',
          headers: headers(peerToken, { 'idempotency-key': `peer-${stamp}` }),
          body: JSON.stringify({ version: read.version }),
        })
      ).status,
      404,
    );
    const proof = await client.query(
      "select (select count(*) from employee_notifications where tenant_id=$1 and employee_id=$2)::int as notifications,(select count(*) from audit_logs where tenant_id=$1 and resource_id=$3 and action='employee.notification_read')::int as audits,(select count(*) from outbox_events where tenant_id=$1 and aggregate_id=$3 and event_type='employee.notification_read.v1')::int as outbox",
      [tenant, owner.employee, taskNotification.id],
    );
    assert.deepEqual(proof.rows[0], { notifications: 4, audits: 1, outbox: 1 });
  } finally {
    await client.end();
  }
});
