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
const base = 'http://127.0.0.1:3098';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3098', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'page-m-007-api' },
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
      // API process is still starting.
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

test('management stores preserve tenant scope, actual entry metrics, manager audit and version control', async () => {
  await ready();
  const client = new Client({ connectionString: db });
  await client.connect();
  const org = randomUUID(),
    merchant = randomUUID(),
    store = randomUUID(),
    user = randomUUID(),
    membership = randomUUID(),
    employee = randomUUID();
  try {
    await client.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,created_by,updated_by) values($1,$2,$3,'Store test org','team',null,null)",
      [org, tenant, `m007-${store.slice(0, 8)}`],
    );
    await client.query(
      "insert into merchants(id,tenant_id,organization_id,code,name,created_by,updated_by) values($1,$2,$3,$4,'Store test merchant',null,null)",
      [merchant, tenant, org, `m007-m-${store.slice(0, 8)}`],
    );
    await client.query(
      "insert into stores(id,tenant_id,organization_id,merchant_id,code,name,address,created_by,updated_by) values($1,$2,$3,$4,$5,'Store comparison target','Test address',null,null)",
      [store, tenant, org, merchant, `m007-s-${store.slice(0, 8)}`],
    );
    await client.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,'Store manager',password_hash,'active',null,null from users where email='admin@system.local'",
      [user, `m007-${store.slice(0, 8)}@example.test`],
    );
    await client.query(
      "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [membership, tenant, user],
    );
    await client.query(
      "insert into employees(id,tenant_id,membership_id,organization_id,employee_code,title,status,created_by,updated_by) values($1,$2,$3,$4,$5,'Manager','active',null,null)",
      [employee, tenant, membership, org, `M007-${store.slice(0, 5)}`],
    );
    await client.query(
      "insert into store_services(id,tenant_id,store_id,code,name,created_by,updated_by) values($1,$2,$3,'m007-service','Store service',null,null)",
      [randomUUID(), tenant, store],
    );
    const action = randomUUID();
    await client.query(
      "insert into external_actions(id,tenant_id,code,name,action_type,target_url,created_by,updated_by) values($1,$2,$3,'Store entry','link','https://example.test',null,null)",
      [action, tenant, `m007-a-${store.slice(0, 8)}`],
    );
    await client.query(
      "insert into store_benefits(id,tenant_id,store_id,title,external_action_id,created_by,updated_by) values($1,$2,$3,'Store entry',$4,null,null)",
      [randomUUID(), tenant, store, action],
    );
    await client.query(
      'insert into consumer_action_events(id,tenant_id,store_id,external_action_id,idempotency_key,created_by,updated_by) values($1,$2,$3,$4,$5,null,null)',
      [randomUUID(), tenant, store, action, randomUUID()],
    );
    const token = await login();
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/stores`, {
          headers: { 'x-request-id': randomUUID() },
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/stores`, {
          headers: { ...headers(token), 'x-tenant-context': randomUUID() },
        })
      ).status,
      403,
    );
    const listed = await fetch(`${base}/api/v1/management/stores`, { headers: headers(token) });
    const item = (await listed.json()).data.find((row) => row.id === store);
    assert.equal(item.entryOpens30d, 1);
    assert.equal(item.entryCount, 1);
    assert.equal(item.activeServices, 1);
    const assigned = await fetch(`${base}/api/v1/management/stores/${store}/manager`, {
      method: 'PATCH',
      headers: headers(token),
      body: JSON.stringify({ employeeId: employee, version: 1 }),
    });
    assert.equal((await assigned.json()).data.version, 2);
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/stores/${store}/manager`, {
          method: 'PATCH',
          headers: headers(token),
          body: JSON.stringify({ employeeId: employee, version: 1 }),
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await client.query(
          "select count(*)::int count from audit_logs where resource_id=$1 and action='store.manager_assigned'",
          [store],
        )
      ).rows[0].count,
      1,
    );
    assert.equal(
      (
        await client.query(
          "select count(*)::int count from outbox_events where aggregate_id=$1 and event_type='store.manager_assigned.v1'",
          [store],
        )
      ).rows[0].count,
      1,
    );
  } finally {
    await client.end();
  }
});
