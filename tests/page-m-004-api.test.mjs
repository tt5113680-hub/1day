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
const base = 'http://127.0.0.1:3090';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3090', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'page-m-004-api' },
  stdio: 'ignore',
});
const headers = (token, extra = {}) => ({
  authorization: `Bearer ${token}`,
  'x-request-id': randomUUID(),
  ...extra,
});
async function ready() {
  for (let i = 0; i < 30; i += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      /* waiting for production API */
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
test('management detail keeps full customer chain tenant-scoped and identity-minimized', async () => {
  await ready();
  const client = new Client({ connectionString: db });
  await client.connect();
  const customerId = randomUUID();
  const orderNumber = `M004-${customerId.slice(0, 8)}`;
  try {
    await client.query(
      "insert into customers(id,tenant_id,display_name,status,created_by,updated_by) values($1,$2,'Management Detail Customer','active',null,null)",
      [customerId, tenant],
    );
    await client.query(
      "insert into customer_identities(id,tenant_id,customer_id,identity_type,identity_value_hash,masked_value,created_by,updated_by) values($1,$2,$3,'phone',$4,'138****0001',null,null)",
      [randomUUID(), tenant, customerId, `hash-${customerId}`],
    );
    await client.query(
      "insert into customer_sources(id,tenant_id,customer_id,source_role,source_type,status,created_by,updated_by) values($1,$2,$3,'first_source','campaign','active',null,null)",
      [randomUUID(), tenant, customerId],
    );
    await client.query(
      'insert into customer_orders(id,tenant_id,customer_id,order_number,occurred_at,created_by,updated_by) values($1,$2,$3,$4,now(),null,null)',
      [randomUUID(), tenant, customerId, orderNumber],
    );
    const token = await login();
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/customers/${customerId}`, {
          headers: { 'x-request-id': randomUUID() },
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/customers/${customerId}`, {
          headers: headers(token, { 'x-tenant-context': randomUUID() }),
        })
      ).status,
      403,
    );
    assert.equal(
      (await fetch(`${base}/api/v1/management/customers/not-an-id`, { headers: headers(token) }))
        .status,
      400,
    );
    const detail = await fetch(`${base}/api/v1/management/customers/${customerId}`, {
      headers: headers(token),
    });
    assert.equal(detail.status, 200);
    const data = (await detail.json()).data;
    assert.equal(data.customer.displayName, 'Management Detail Customer');
    assert.equal(data.customer.identities[0].maskedValue, '138****0001');
    assert.equal(JSON.stringify(data).includes(`hash-${customerId}`), false);
    assert.equal(data.sources[0].source_type, 'campaign');
    assert.equal(data.orders[0].order_number, orderNumber);
    assert.equal(
      data.anomalies.some((item) => item.type === 'unassigned'),
      true,
    );
  } finally {
    await client.end();
  }
});
