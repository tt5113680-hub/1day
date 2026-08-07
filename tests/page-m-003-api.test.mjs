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
  base = 'http://127.0.0.1:3087';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3087', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'page-m-003-api' },
  stdio: 'ignore',
});
const headers = (token, key, extra = {}) => ({
  authorization: `Bearer ${token}`,
  'content-type': 'application/json',
  'x-request-id': randomUUID(),
  ...(key ? { 'idempotency-key': key } : {}),
  ...extra,
});
async function ready() {
  for (let i = 0; i < 30; i += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      /* starting */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error('API did not start');
}
async function login() {
  const r = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@system.local',
      password: 'ChangeMe123!',
      tenantId: tenant,
    }),
  });
  assert.equal(r.status, 201);
  return (await r.json()).accessToken;
}
test.after(() => api.kill());
test('management customer assets filter tenant data and audit approved exports', async () => {
  await ready();
  const c = new Client({ connectionString: db });
  await c.connect();
  const id = randomUUID(),
    stamp = Date.now().toString();
  try {
    await c.query(
      "insert into customers(id,tenant_id,display_name,status,created_by,updated_by) values($1,$2,'Asset Search Customer','active',null,null)",
      [id, tenant],
    );
    await c.query(
      "insert into customer_tags(id,tenant_id,customer_id,label,created_by,updated_by) values($1,$2,$3,'VIP',null,null)",
      [randomUUID(), tenant, id],
    );
    await c.query(
      "insert into customer_sources(id,tenant_id,customer_id,source_role,source_type,status,created_by,updated_by) values($1,$2,$3,'first_source','campaign','active',null,null)",
      [randomUUID(), tenant, id],
    );
    const token = await login();
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/customers`, {
          headers: { 'x-request-id': randomUUID() },
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/customers?tag=VIP&source=campaign`, {
          headers: headers(token, null, { 'x-tenant-context': randomUUID() }),
        })
      ).status,
      403,
    );
    const list = await fetch(
      `${base}/api/v1/management/customers?tag=VIP&source=campaign&search=Asset`,
      { headers: headers(token) },
    );
    assert.equal(list.status, 200);
    assert.equal(
      (await list.json()).data.some((x) => x.id === id),
      true,
    );
    const body = { filters: { tag: 'VIP', source: 'campaign' } };
    const first = await fetch(`${base}/api/v1/management/customers/exports`, {
      method: 'POST',
      headers: headers(token, `export-${stamp}`),
      body: JSON.stringify(body),
    });
    assert.equal(first.status, 201);
    const request = (await first.json()).data;
    const replay = await fetch(`${base}/api/v1/management/customers/exports`, {
      method: 'POST',
      headers: headers(token, `export-${stamp}`),
      body: JSON.stringify(body),
    });
    assert.equal((await replay.json()).data.id, request.id);
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/customers/exports/${request.id}/approve`, {
          method: 'POST',
          headers: headers(token),
          body: JSON.stringify({ version: request.version, decision: 'approve' }),
        })
      ).status,
      201,
    );
    const download = await fetch(
      `${base}/api/v1/management/customers/exports/${request.id}/download`,
      {
        headers: headers(token),
      },
    );
    assert.equal(download.status, 200);
    assert.match(download.headers.get('content-type'), /text\/csv/);
    assert.match(await download.text(), /Asset Search Customer/);
    const employee = await c.query(
      "select id from employees where tenant_id=$1 and status='active' and deleted_at is null limit 1",
      [tenant],
    );
    assert.equal(employee.rowCount, 1);
    const bulk = await fetch(`${base}/api/v1/management/customers/ownership/batch`, {
      method: 'POST',
      headers: headers(token, `ownership-${stamp}`),
      body: JSON.stringify({
        items: [{ customerId: id, version: 1 }],
        toEmployeeId: employee.rows[0].id,
        reason: 'Portfolio review',
      }),
    });
    assert.equal(bulk.status, 201);
    assert.equal((await bulk.json()).data.count, 1);
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/customers/exports/${request.id}/approve`, {
          method: 'POST',
          headers: headers(token),
          body: JSON.stringify({ version: request.version, decision: 'approve' }),
        })
      ).status,
      409,
    );
    const audit = await c.query(
      "select action from audit_logs where tenant_id=$1 and resource_id=$2 and action='customer.export_approved'",
      [tenant, request.id],
    );
    const event = await c.query(
      "select event_type from outbox_events where tenant_id=$1 and aggregate_id=$2 and event_type='customer.export_approved.v1'",
      [tenant, request.id],
    );
    assert.equal(audit.rowCount, 1);
    assert.equal(event.rowCount, 1);
    const downloaded = await c.query(
      "select id from audit_logs where tenant_id=$1 and resource_id=$2 and action='customer.export_downloaded'",
      [tenant, request.id],
    );
    const transfer = await c.query(
      "select id from customer_ownership_transfer_approvals where tenant_id=$1 and customer_id=$2 and reason='Portfolio review'",
      [tenant, id],
    );
    assert.equal(downloaded.rowCount, 1);
    assert.equal(transfer.rowCount, 1);
  } finally {
    await c.end();
  }
});
