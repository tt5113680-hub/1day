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
const base = 'http://127.0.0.1:3065';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3065', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'page-e-005-api' },
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
test('employee share codes enforce scope, trace opens and reject revoked or expired codes', async () => {
  await ready();
  const client = new Client({ connectionString: db });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const organization = randomUUID();
  const user = randomUUID();
  const membership = randomUUID();
  const employee = randomUUID();
  const email = `share-${stamp}@example.test`;
  try {
    await client.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,'Share org','team','active',null,null)",
      [organization, tenant, `share-${stamp}`],
    );
    await client.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,'Share owner',password_hash,'active',null,null from users where email='admin@system.local'",
      [user, email],
    );
    await client.query(
      "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [membership, tenant, user],
    );
    await client.query(
      "insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,'00000000-0000-4000-8000-000000000004')",
      [randomUUID(), tenant, membership],
    );
    await client.query(
      "insert into employees(id,tenant_id,membership_id,organization_id,employee_code,title,status,created_by,updated_by) values($1,$2,$3,$4,$5,'Advisor','active',null,null)",
      [employee, tenant, membership, organization, `SHARE-${stamp}`],
    );
    const token = await login(email);
    const create = () =>
      fetch(`${base}/api/v1/employee/share-codes`, {
        method: 'POST',
        headers: headers(token, { 'idempotency-key': `share-${stamp}` }),
        body: JSON.stringify({
          scenario: 'campaign',
          targetPath: '/c/entry',
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
    const response = await create();
    assert.equal(response.status, 201);
    const created = (await response.json()).data;
    assert.equal(created.scenario, 'campaign');
    assert.equal(created.status, 'active');
    const replay = await create();
    assert.deepEqual((await replay.json()).data, created);
    const opened = await fetch(`${base}/api/v1/public/share-codes/${created.code}/open`, {
      method: 'POST',
    });
    assert.equal(opened.status, 201);
    assert.deepEqual((await opened.json()).data, {
      code: created.code,
      scenario: 'campaign',
      targetPath: '/c/entry',
      tenant: 'system',
    });
    const listed = await fetch(`${base}/api/v1/employee/share-codes`, { headers: headers(token) });
    assert.equal(listed.status, 200);
    assert.equal((await listed.json()).data[0].opens, 1);
    const revoked = await fetch(`${base}/api/v1/employee/share-codes/${created.id}/revoke`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ version: created.version }),
    });
    assert.equal(revoked.status, 201);
    assert.equal((await revoked.json()).data.status, 'revoked');
    assert.equal(
      (await fetch(`${base}/api/v1/public/share-codes/${created.code}/open`, { method: 'POST' }))
        .status,
      404,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/employee/share-codes/${created.id}/revoke`, {
          method: 'POST',
          headers: headers(token),
          body: JSON.stringify({ version: created.version }),
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/employee/share-codes`, {
          method: 'POST',
          headers: headers(token, { 'idempotency-key': randomUUID() }),
          body: JSON.stringify({ scenario: 'employee', expiresAt: '2000-01-01T00:00:00.000Z' }),
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/employee/share-codes`, {
          headers: { 'x-request-id': randomUUID() },
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/employee/share-codes`, {
          headers: headers(token, { 'x-tenant-context': randomUUID() }),
        })
      ).status,
      403,
    );
    const proof = await client.query(
      "select (select count(*) from employee_share_codes where tenant_id=$1 and id=$2)::int as codes,(select count(*) from employee_share_code_events where tenant_id=$1 and share_code_id=$2 and event_type='opened')::int as opens,(select count(*) from audit_logs where tenant_id=$1 and resource_id=$2 and action in ('employee.share_code_created','employee.share_code_opened','employee.share_code_revoked'))::int as audits,(select count(*) from outbox_events where tenant_id=$1 and aggregate_id=$2 and event_type in ('employee.share_code.created.v1','employee.share_code.opened.v1','employee.share_code.revoked.v1'))::int as outbox",
      [tenant, created.id],
    );
    assert.deepEqual(proof.rows[0], { codes: 1, opens: 1, audits: 3, outbox: 3 });
  } finally {
    await client.end();
  }
});
