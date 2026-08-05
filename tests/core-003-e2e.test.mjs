/* global fetch,setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
const base = 'http://127.0.0.1:3018',
  tenantId = '00000000-0000-4000-8000-000000000001',
  env = {
    ...process.env,
    PORT: '3018',
    DATABASE_URL: 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test',
    AUTH_TOKEN_SECRET: 'core-003-e2e-secret',
  },
  api = spawn(process.execPath, ['apps/api/dist/main.js'], {
    cwd: process.cwd(),
    env,
    stdio: 'ignore',
  });
const req = (p, o) => fetch(base + p, o),
  heads = (t, k) => ({
    authorization: `Bearer ${t}`,
    'content-type': 'application/json',
    'x-request-id': randomUUID(),
    ...(k ? { 'idempotency-key': k } : {}),
  });
async function ready() {
  for (let i = 0; i < 30; i += 1) {
    try {
      if ((await req('/api/v1/health')).ok) return;
    } catch {
      /* starting */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error('ready');
}
async function login() {
  const r = await req('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin@system.local', password: 'ChangeMe123!', tenantId }),
  });
  return (await r.json()).accessToken;
}
test.after(() => api.kill());
test('role templates require confirmed, versioned permission changes', async () => {
  await ready();
  const token = await login(),
    key = `role-${Date.now()}`,
    body = { code: key, name: 'Core role' };
  const created = await req('/api/v1/rbac/roles', {
    method: 'POST',
    headers: heads(token, key),
    body: JSON.stringify(body),
  });
  assert.equal(created.status, 201);
  const role = (await created.json()).data;
  assert.equal((await req('/api/v1/rbac/roles', { headers: heads(token) })).status, 200);
  assert.equal(
    (
      await req(`/api/v1/rbac/roles/${role.id}/permissions`, {
        method: 'POST',
        headers: heads(token),
        body: JSON.stringify({
          version: role.version,
          reason: 'test',
          permissionCodes: ['tenant.read'],
        }),
      })
    ).status,
    400,
  );
  const changed = await req(`/api/v1/rbac/roles/${role.id}/permissions`, {
    method: 'POST',
    headers: heads(token),
    body: JSON.stringify({
      version: role.version,
      confirmation: 'CONFIRM_PERMISSION_CHANGE',
      reason: 'test',
      permissionCodes: ['tenant.read'],
    }),
  });
  assert.equal(changed.status, 201);
  assert.equal(
    (
      await req(`/api/v1/rbac/roles/${role.id}/permissions`, {
        method: 'POST',
        headers: heads(token),
        body: JSON.stringify({
          version: role.version,
          confirmation: 'CONFIRM_PERMISSION_CHANGE',
          reason: 'stale',
          permissionCodes: ['tenant.read'],
        }),
      })
    ).status,
    409,
  );
  assert.equal(
    (await req('/api/v1/rbac/roles', { headers: { 'x-request-id': randomUUID() } })).status,
    401,
  );
  assert.equal(
    (
      await req('/api/v1/rbac/roles', {
        headers: { ...heads(token), 'x-tenant-context': '00000000-0000-4000-8000-000000000099' },
      })
    ).status,
    403,
  );
});
