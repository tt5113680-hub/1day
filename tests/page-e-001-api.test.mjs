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
const base = 'http://127.0.0.1:3053';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3053', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'page-e-001-api' },
  stdio: 'ignore',
});
const headers = (token) => ({
  authorization: `Bearer ${token}`,
  'content-type': 'application/json',
  'x-request-id': randomUUID(),
});
async function ready() {
  for (let i = 0; i < 30; i += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      // API is starting.
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

test('employee workbench only exposes and completes the signed-in employee tasks', async () => {
  await ready();
  const c = new Client({ connectionString: db });
  await c.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const organization = randomUUID();
  const employeeUser = randomUUID();
  const employeeMembership = randomUUID();
  const employee = randomUUID();
  const peerUser = randomUUID();
  const peerMembership = randomUUID();
  const peer = randomUUID();
  const customer = randomUUID();
  const ownTask = randomUUID();
  const peerTask = randomUUID();
  const email = `workbench-${stamp}@example.test`;
  try {
    await c.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,'Workbench organization','team','active',null,null)",
      [organization, tenant, `workbench-org-${stamp}`],
    );
    for (const [user, membership, employeeId, employeeEmail, code] of [
      [employeeUser, employeeMembership, employee, email, `WB-${stamp}`],
      [peerUser, peerMembership, peer, `peer-${stamp}@example.test`, `PEER-${stamp}`],
    ]) {
      await c.query(
        "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
        [user, employeeEmail, employeeId === employee ? 'Workbench Owner' : 'Workbench Peer'],
      );
      await c.query(
        "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
        [membership, tenant, user],
      );
      await c.query(
        'insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,$4)',
        [randomUUID(), tenant, membership, '00000000-0000-4000-8000-000000000004'],
      );
      await c.query(
        "insert into employees(id,tenant_id,membership_id,organization_id,employee_code,title,status,created_by,updated_by) values($1,$2,$3,$4,$5,'Advisor','active',null,null)",
        [employeeId, tenant, membership, organization, code],
      );
    }
    await c.query(
      "insert into customers(id,tenant_id,display_name,status,created_by,updated_by) values($1,$2,'Workbench customer','active',null,null)",
      [customer, tenant],
    );
    await c.query(
      "insert into tasks(id,tenant_id,customer_id,assignee_employee_id,title,due_at,status,created_by,updated_by) values($1,$2,$3,$4,'Call workbench customer',now()+interval '1 hour','open',null,null)",
      [ownTask, tenant, customer, employee],
    );
    await c.query(
      "insert into tasks(id,tenant_id,assignee_employee_id,title,due_at,status,created_by,updated_by) values($1,$2,$3,'Peer-only task',now()+interval '1 hour','open',null,null)",
      [peerTask, tenant, peer],
    );
    const token = await login(email);
    assert.equal(
      (await fetch(`${base}/api/v1/employee/workbench`, { headers: headers(token) })).status,
      200,
    );
    const overview = await (
      await fetch(`${base}/api/v1/employee/workbench`, { headers: headers(token) })
    ).json();
    assert.equal(overview.data.tasks.length, 1);
    assert.equal(overview.data.tasks[0].id, ownTask);
    assert.equal(overview.data.customerReminders[0].customer.displayName, 'Workbench customer');
    assert.equal(overview.data.opportunities[0].source, 'task_due_signal');
    assert.equal(
      (
        await fetch(`${base}/api/v1/employee/workbench`, {
          headers: { 'x-request-id': randomUUID() },
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/employee/workbench`, {
          headers: { ...headers(token), 'x-tenant-context': randomUUID() },
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/employee/workbench/tasks/${peerTask}/complete`, {
          method: 'POST',
          headers: headers(token),
          body: JSON.stringify({ version: 1 }),
        })
      ).status,
      404,
    );
    const complete = await fetch(`${base}/api/v1/employee/workbench/tasks/${ownTask}/complete`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ version: 1 }),
    });
    assert.equal(complete.status, 201);
    assert.deepEqual((await complete.json()).data, {
      id: ownTask,
      status: 'completed',
      version: 2,
    });
    const replay = await fetch(`${base}/api/v1/employee/workbench/tasks/${ownTask}/complete`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ version: 1 }),
    });
    assert.equal(replay.status, 409);
    const proof = await c.query(
      "select (select count(*) from audit_logs where tenant_id=$1 and resource_id=$2 and action='employee.workbench_task_completed')::int as audits,(select count(*) from outbox_events where tenant_id=$1 and aggregate_id=$2 and event_type='employee.workbench.task_completed.v1')::int as outbox",
      [tenant, ownTask],
    );
    assert.deepEqual(proof.rows[0], { audits: 1, outbox: 1 });
  } finally {
    await c.end();
  }
});
