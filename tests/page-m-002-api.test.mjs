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
const base = 'http://127.0.0.1:3084';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3084', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'page-m-002-api' },
  stdio: 'ignore',
});
const headers = (token, extra = {}) => ({
  authorization: `Bearer ${token}`,
  'x-request-id': randomUUID(),
  ...extra,
});
async function ready() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
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

test('management funnel separates confirmed cohort outcomes from unavailable visit inference', async () => {
  await ready();
  const client = new Client({ connectionString: db });
  await client.connect();
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const customers = [randomUUID(), randomUUID()];
  try {
    for (const [index, customer] of customers.entries()) {
      await client.query(
        "insert into customers(id,tenant_id,display_name,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
        [customer, tenant, `Funnel ${suffix}-${index}`],
      );
      await client.query(
        "insert into customer_sources(id,tenant_id,customer_id,source_role,source_type,status,created_by,updated_by) values($1,$2,$3,'first_source','campaign','active',null,null)",
        [randomUUID(), tenant, customer],
      );
    }
    const employee = (
      await client.query(
        "select id from employees where tenant_id=$1 and status='active' limit 1",
        [tenant],
      )
    ).rows[0].id;
    await client.query(
      "insert into tasks(id,tenant_id,customer_id,assignee_employee_id,title,due_at,status,created_by,updated_by) values($1,$2,$3,$4,'Funnel follow-up',now(),'open',null,null)",
      [randomUUID(), tenant, customers[0], employee],
    );
    for (let order = 0; order < 2; order += 1)
      await client.query(
        "insert into customer_orders(id,tenant_id,customer_id,order_number,occurred_at,status,created_by,updated_by) values($1,$2,$3,$4,now(),'active',null,null)",
        [randomUUID(), tenant, customers[0], `FUNNEL-${suffix}-${order}`],
      );
    const token = await login();
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/funnels/campaign`, {
          headers: { 'x-request-id': randomUUID() },
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/funnels/campaign`, {
          headers: headers(token, { 'x-tenant-context': randomUUID() }),
        })
      ).status,
      403,
    );
    assert.equal(
      (await fetch(`${base}/api/v1/management/funnels/not%20valid`, { headers: headers(token) }))
        .status,
      400,
    );
    const response = await fetch(`${base}/api/v1/management/funnels/campaign`, {
      headers: headers(token),
    });
    assert.equal(response.status, 200);
    const stages = (await response.json()).data.stages;
    assert.equal(stages.find((stage) => stage.id === 'source').value >= 2, true);
    assert.equal(stages.find((stage) => stage.id === 'lead').value >= 2, true);
    assert.equal(stages.find((stage) => stage.id === 'follow_up').value >= 1, true);
    assert.equal(stages.find((stage) => stage.id === 'repurchase').value >= 1, true);
    assert.equal(stages.find((stage) => stage.id === 'visit').resultType, 'inferred');
    assert.equal(stages.find((stage) => stage.id === 'visit').value, null);
  } finally {
    await client.end();
  }
});
