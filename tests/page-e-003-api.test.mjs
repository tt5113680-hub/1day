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
const base = 'http://127.0.0.1:3059';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3059', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'page-e-003-api' },
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
      /* API is starting. */
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

test('employee customer detail exposes only related, tenant-scoped and masked records', async () => {
  await ready();
  const c = new Client({ connectionString: db });
  await c.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const organization = randomUUID();
  const user = randomUUID();
  const membership = randomUUID();
  const employee = randomUUID();
  const related = randomUUID();
  const hidden = randomUUID();
  const task = randomUUID();
  const email = `customer-detail-${stamp}@example.test`;
  try {
    await c.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,'Customer detail org','team','active',null,null)",
      [organization, tenant, `cd-org-${stamp}`],
    );
    await c.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,'Customer Detail Advisor',password_hash,'active',null,null from users where email='admin@system.local'",
      [user, email],
    );
    await c.query(
      "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [membership, tenant, user],
    );
    await c.query(
      "insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,'00000000-0000-4000-8000-000000000004')",
      [randomUUID(), tenant, membership],
    );
    await c.query(
      "insert into employees(id,tenant_id,membership_id,organization_id,employee_code,title,status,created_by,updated_by) values($1,$2,$3,$4,$5,'Advisor','active',null,null)",
      [employee, tenant, membership, organization, `CD-${stamp}`],
    );
    await c.query(
      "insert into customers(id,tenant_id,display_name,status,created_by,updated_by) values($1,$2,'Related Customer','active',null,null),($3,$2,'Hidden Customer','active',null,null)",
      [related, tenant, hidden],
    );
    await c.query(
      "insert into customer_identities(id,tenant_id,customer_id,identity_type,identity_value_hash,masked_value,status,created_by,updated_by) values($1,$2,$3,'phone',$4,'138****1234','active',null,null)",
      [randomUUID(), tenant, related, `${stamp}`.padEnd(64, 'a')],
    );
    await c.query(
      "insert into customer_ownerships(id,tenant_id,customer_id,employee_id,ownership_role,status,created_by,updated_by) values($1,$2,$3,$4,'owner','active',null,null)",
      [randomUUID(), tenant, related, employee],
    );
    await c.query(
      "insert into customer_sources(id,tenant_id,customer_id,source_role,source_type,status,created_by,updated_by) values($1,$2,$3,'first_source','referral','active',null,null)",
      [randomUUID(), tenant, related],
    );
    await c.query(
      "insert into customer_tags(id,tenant_id,customer_id,label,created_by,updated_by) values($1,$2,$3,'High intent',null,null),($4,$2,$3,'VIP follow-up',null,null)",
      [randomUUID(), tenant, related, randomUUID()],
    );
    await c.query(
      "insert into tasks(id,tenant_id,customer_id,assignee_employee_id,title,due_at,status,created_by,updated_by) values($1,$2,$3,$4,'Call related customer',now()+interval '1 hour','open',null,null)",
      [task, tenant, related, employee],
    );
    await c.query(
      "insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by) values($1,$2,$3,'customer.source_recorded','customer',$4,$5,'page-e-003','{}',$3,$3)",
      [randomUUID(), tenant, user, related, randomUUID()],
    );
    const token = await login(email);
    const response = await fetch(`${base}/api/v1/employee/customers/${related}`, {
      headers: headers(token),
    });
    assert.equal(response.status, 200);
    const data = (await response.json()).data;
    assert.equal(data.customer.displayName, 'Related Customer');
    assert.deepEqual(data.customer.identities, [
      { type: 'phone', maskedValue: '138****1234', status: 'active' },
    ]);
    assert.deepEqual(
      data.tags.map((item) => item.label),
      ['High intent', 'VIP follow-up'],
    );
    assert.equal(data.sources[0].source_type, 'referral');
    assert.equal(data.ownerships[0].isCurrentEmployee, true);
    assert.equal(data.tasks[0].id, task);
    assert.equal(
      data.timeline.some((item) => item.action === 'customer.source_recorded'),
      true,
    );
    assert.equal(JSON.stringify(data).includes('identity_value_hash'), false);
    assert.equal(
      (await fetch(`${base}/api/v1/employee/customers/${hidden}`, { headers: headers(token) }))
        .status,
      404,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/employee/customers/${related}`, {
          headers: { 'x-request-id': randomUUID() },
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/employee/customers/${related}`, {
          headers: headers(token, { 'x-tenant-context': randomUUID() }),
        })
      ).status,
      403,
    );
  } finally {
    await c.end();
  }
});
