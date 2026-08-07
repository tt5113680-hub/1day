/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';
const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test',
  tenant = '00000000-0000-4000-8000-000000000001',
  base = 'http://127.0.0.1:3081';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3081', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'page-m-001-api' },
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
  const r = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'ChangeMe123!', tenantId: tenant }),
  });
  assert.equal(r.status, 201);
  return (await r.json()).accessToken;
}
test.after(() => api.kill());
test('management dashboard reports tenant-bound metrics, anomalies and explainable actions', async () => {
  await ready();
  const c = new Client({ connectionString: db });
  await c.connect();
  const s = `${Date.now()}${Math.floor(Math.random() * 1000)}`,
    org = randomUUID(),
    manager = {
      user: randomUUID(),
      membership: randomUUID(),
      employee: randomUUID(),
      email: `dashboard-${s}@example.test`,
    },
    observer = {
      user: randomUUID(),
      membership: randomUUID(),
      email: `observer-${s}@example.test`,
    },
    customer = randomUUID();
  try {
    await c.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,'Dashboard org','team','active',null,null)",
      [org, tenant, `dashboard-${s}`],
    );
    await c.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,'Dashboard manager',password_hash,'active',null,null from users where email='admin@system.local'",
      [manager.user, manager.email],
    );
    await c.query(
      "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [manager.membership, tenant, manager.user],
    );
    await c.query(
      "insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,'00000000-0000-4000-8000-000000000004')",
      [randomUUID(), tenant, manager.membership],
    );
    await c.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,'Dashboard observer',password_hash,'active',null,null from users where email='admin@system.local'",
      [observer.user, observer.email],
    );
    await c.query(
      "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [observer.membership, tenant, observer.user],
    );
    await c.query(
      "insert into employees(id,tenant_id,membership_id,organization_id,employee_code,title,status,created_by,updated_by) values($1,$2,$3,$4,$5,'Manager','active',null,null)",
      [manager.employee, tenant, manager.membership, org, `M-${s}`],
    );
    await c.query(
      "insert into customers(id,tenant_id,display_name,status,created_by,updated_by) values($1,$2,'Dashboard customer','active',null,null)",
      [customer, tenant],
    );
    const order = randomUUID(),
      overdue = randomUUID();
    await c.query(
      "insert into customer_orders(id,tenant_id,customer_id,order_number,occurred_at,status,created_by,updated_by) values($1,$2,$3,$4,now(),'active',null,null)",
      [order, tenant, customer, `DASH-${s}`],
    );
    await c.query(
      "insert into tasks(id,tenant_id,customer_id,assignee_employee_id,title,due_at,status,created_by,updated_by) values($1,$2,$3,$4,'Recover dashboard task',now()-interval '1 day','overdue',null,null)",
      [overdue, tenant, customer, manager.employee],
    );
    const token = await login(manager.email),
      observerToken = await login(observer.email);
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/dashboard`, {
          headers: { 'x-request-id': randomUUID() },
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/dashboard`, {
          headers: headers(token, { 'x-tenant-context': randomUUID() }),
        })
      ).status,
      403,
    );
    assert.equal(
      (await fetch(`${base}/api/v1/management/dashboard`, { headers: headers(observerToken) }))
        .status,
      403,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/dashboard`, {
          headers: { authorization: `Bearer ${token}` },
        })
      ).status,
      400,
    );
    const r = await fetch(`${base}/api/v1/management/dashboard`, { headers: headers(token) });
    assert.equal(r.status, 200);
    const data = (await r.json()).data;
    assert.equal(data.metrics.orders30d >= 1, true);
    assert.equal(data.metrics.openTasks >= 1, true);
    assert.equal(
      data.anomalies.some((x) => x.id === overdue && x.deepLink === `/e/tasks/${overdue}`),
      true,
    );
    assert.equal(
      data.suggestions.some((x) => x.id === 'overdue-recovery'),
      true,
    );
  } finally {
    await c.end();
  }
});
