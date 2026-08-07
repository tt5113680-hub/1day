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
const base = 'http://127.0.0.1:3105';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3105', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'page-m-010-api' },
  stdio: 'ignore',
});
const headers = (token) => ({ authorization: `Bearer ${token}`, 'x-request-id': randomUUID() });
async function ready() {
  for (let i = 0; i < 30; i += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      // Starting.
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
test('permission audit projects tenant-scoped changes, exports, risk signals and evidence', async () => {
  await ready();
  const client = new Client({ connectionString: db });
  await client.connect();
  try {
    const token = await login();
    const resource = randomUUID();
    const roleChange = randomUUID();
    await client.query(
      `insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by)
       values($1,$2,null,'role.permissions_changed','role',$3,$4,'page-m-010', $5::jsonb,null,null),
             ($6,$2,null,'customer.export_requested','customer_export_request',$7,$8,'page-m-010','{}'::jsonb,null,null)`,
      [
        randomUUID(),
        tenant,
        resource,
        roleChange,
        JSON.stringify({ before: ['tenant.read'], after: ['tenant.read', 'tenant.manage'] }),
        randomUUID(),
        randomUUID(),
        randomUUID(),
      ],
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/permission-audit`, {
          headers: { 'x-request-id': randomUUID() },
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/permission-audit?filter=unknown`, {
          headers: headers(token),
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/permission-audit`, {
          headers: { ...headers(token), 'x-tenant-context': randomUUID() },
        })
      ).status,
      403,
    );
    const overview = await fetch(`${base}/api/v1/management/permission-audit?filter=all`, {
      headers: headers(token),
    });
    assert.equal(overview.status, 200);
    const data = (await overview.json()).data;
    const change = data.records.find((record) => record.correlationId === roleChange);
    assert.equal(change.kind, 'unattributed_privileged');
    assert.equal(change.detail.after.includes('tenant.manage'), true);
    assert.equal(
      data.records.some((record) => record.kind === 'export'),
      true,
    );
    const risks = await fetch(`${base}/api/v1/management/permission-audit?filter=risk`, {
      headers: headers(token),
    });
    assert.equal(
      (await risks.json()).data.records.some((record) => record.correlationId === roleChange),
      true,
    );
  } finally {
    await client.end();
  }
});
