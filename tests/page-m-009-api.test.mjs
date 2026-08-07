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
  base = 'http://127.0.0.1:3102';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3102', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'page-m-009-api' },
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
test('role permission projection scopes tenant data and confirms sensitive changes', async () => {
  await ready();
  const client = new Client({ connectionString: db });
  await client.connect();
  try {
    const token = await login();
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/roles-permissions`, {
          headers: { 'x-request-id': randomUUID() },
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/roles-permissions`, {
          headers: { ...headers(token), 'x-tenant-context': randomUUID() },
        })
      ).status,
      403,
    );
    const overview = await fetch(`${base}/api/v1/management/roles-permissions`, {
      headers: headers(token),
    });
    const data = (await overview.json()).data;
    const role = data.roles[0];
    assert.ok(role);
    assert.equal(
      data.permissions.some((permission) => permission.code === 'tenant.manage'),
      true,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/rbac/roles/${role.id}/permissions`, {
          method: 'POST',
          headers: headers(token),
          body: JSON.stringify({
            version: role.version,
            permissionCodes: role.permissions,
            reason: 'M009 acceptance',
            confirmation: 'NO',
          }),
        })
      ).status,
      400,
    );
    const changed = await fetch(`${base}/api/v1/rbac/roles/${role.id}/permissions`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({
        version: role.version,
        permissionCodes: role.permissions,
        reason: 'M009 acceptance',
        confirmation: 'CONFIRM_PERMISSION_CHANGE',
      }),
    });
    assert.equal(changed.status, 201);
    assert.equal(
      (
        await client.query(
          "select count(*)::int count from audit_logs where resource_id=$1 and action='role.permissions_changed'",
          [role.id],
        )
      ).rows[0].count >= 1,
      true,
    );
  } finally {
    await client.end();
  }
});
