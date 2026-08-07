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
const base = 'http://127.0.0.1:3100';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3100', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'page-m-008-api' },
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
      /* starting */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw Error('API did not start');
}
async function login() {
  const response = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@system.local',
      password: 'ChangeMe123!',
      tenantId: tenant,
    }),
  });
  assert.equal(response.status, 201);
  return (await response.json()).accessToken;
}
test.after(() => api.kill());

test('organization employee management isolates tenant data and preserves offboarding handoff risk', async () => {
  await ready();
  const client = new Client({ connectionString: db });
  await client.connect();
  const org = randomUUID(),
    user = randomUUID(),
    membership = randomUUID(),
    employee = randomUUID(),
    customer = randomUUID();
  try {
    await client.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,created_by,updated_by) values($1,$2,$3,'M008 organization','team',null,null)",
      [org, tenant, `m008-${org.slice(0, 8)}`],
    );
    await client.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,'M008 employee',password_hash,'active',null,null from users where email='admin@system.local'",
      [user, `m008-${user.slice(0, 8)}@example.test`],
    );
    await client.query(
      "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [membership, tenant, user],
    );
    await client.query(
      "insert into employees(id,tenant_id,membership_id,organization_id,employee_code,title,created_by,updated_by) values($1,$2,$3,$4,$5,'Consultant',null,null)",
      [employee, tenant, membership, org, `M008-${employee.slice(0, 5)}`],
    );
    await client.query(
      "insert into customers(id,tenant_id,display_name,status,created_by,updated_by) values($1,$2,'M008 customer','active',null,null)",
      [customer, tenant],
    );
    await client.query(
      "insert into customer_ownerships(id,tenant_id,customer_id,employee_id,ownership_role,created_by,updated_by) values($1,$2,$3,$4,'primary',null,null)",
      [randomUUID(), tenant, customer, employee],
    );
    await client.query(
      "insert into tasks(id,tenant_id,customer_id,assignee_employee_id,title,due_at,created_by,updated_by) values($1,$2,$3,$4,'M008 handoff task',now(),null,null)",
      [randomUUID(), tenant, customer, employee],
    );
    const token = await login();
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/organization-employees`, {
          headers: { 'x-request-id': randomUUID() },
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/organization-employees`, {
          headers: { ...headers(token), 'x-tenant-context': randomUUID() },
        })
      ).status,
      403,
    );
    const before = await fetch(`${base}/api/v1/management/organization-employees`, {
      headers: headers(token),
    });
    const data = (await before.json()).data;
    assert.equal(
      data.organizations.some((item) => item.id === org && item.active_employee_count >= 1),
      true,
    );
    assert.equal(
      data.employees.some(
        (item) =>
          item.id === employee && item.open_task_count === 1 && item.active_customer_count === 1,
      ),
      true,
    );
    const offboard = await fetch(`${base}/api/v1/employees/${employee}/offboard`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ version: 1 }),
    });
    assert.equal(offboard.status, 201);
    const after = await fetch(`${base}/api/v1/management/organization-employees`, {
      headers: headers(token),
    });
    assert.equal(
      (await after.json()).data.employees.some(
        (item) =>
          item.id === employee &&
          item.status === 'offboarded' &&
          item.open_task_count === 1 &&
          item.active_customer_count === 1,
      ),
      true,
    );
    assert.equal(
      (
        await client.query(
          "select count(*)::int count from audit_logs where resource_id=$1 and action='employee.offboarded'",
          [employee],
        )
      ).rows[0].count,
      1,
    );
  } finally {
    await client.end();
  }
});
