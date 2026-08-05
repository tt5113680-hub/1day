/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import test from 'node:test';
const base = 'http://127.0.0.1:3017',
  tenantId = '00000000-0000-4000-8000-000000000001';
const env = {
  ...process.env,
  PORT: '3017',
  DATABASE_URL: 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test',
  AUTH_TOKEN_SECRET: 'core-002-e2e-secret',
};
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env,
  stdio: 'ignore',
});
const req = (p, o) => fetch(base + p, o);
const headers = (token, key) => ({
  authorization: `Bearer ${token}`,
  'content-type': 'application/json',
  'x-request-id': randomUUID(),
  ...(key ? { 'idempotency-key': key } : {}),
});
async function ready() {
  for (let i = 0; i < 30; i += 1) {
    try {
      if ((await req('/api/v1/health')).ok) return;
    } catch {
      // API is still starting.
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error('API did not become ready');
}
async function login() {
  const r = await req('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin@system.local', password: 'ChangeMe123!', tenantId }),
  });
  assert.equal(r.status, 201);
  return (await r.json()).accessToken;
}
test.after(() => api.kill());
test('invitation acceptance creates a tenant-bound employee and offboarding revokes membership', async () => {
  await ready();
  const token = await login(),
    s = Date.now().toString(36);
  const org = await req('/api/v1/organizations', {
    method: 'POST',
    headers: headers(token, `org-${s}`),
    body: JSON.stringify({ code: `employee-${s}`, name: 'Employee Org', organizationType: 'team' }),
  });
  assert.equal(org.status, 201);
  const organizationId = (await org.json()).data.id;
  const inviteBody = {
    email: `member-${s}@example.test`,
    organizationId,
    employeeCode: `E-${s}`,
    title: 'Advisor',
  };
  const invite = await req('/api/v1/employees/invitations', {
    method: 'POST',
    headers: headers(token, `invite-${s}`),
    body: JSON.stringify(inviteBody),
  });
  assert.equal(invite.status, 201);
  const invitation = (await invite.json()).data;
  const replay = await req('/api/v1/employees/invitations', {
    method: 'POST',
    headers: headers(token, `invite-${s}`),
    body: JSON.stringify(inviteBody),
  });
  assert.equal((await replay.json()).data.id, invitation.id);
  const accepted = await req(`/api/v1/employees/invitations/${invitation.id}/accept`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({
      invitationToken: invitation.invitationToken,
      displayName: 'Core Member',
    }),
  });
  assert.equal(accepted.status, 201);
  const employee = (await accepted.json()).data;
  const offboard = await req(`/api/v1/employees/${employee.id}/offboard`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ version: employee.version }),
  });
  assert.equal(offboard.status, 201);
  const conflict = await req(`/api/v1/employees/${employee.id}/offboard`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ version: employee.version }),
  });
  assert.equal(conflict.status, 409);
  assert.equal(
    (await req('/api/v1/employees', { headers: { 'x-request-id': randomUUID() } })).status,
    401,
  );
  assert.equal(
    (
      await req('/api/v1/employees', {
        headers: { ...headers(token), 'x-tenant-context': '00000000-0000-4000-8000-000000000099' },
      })
    ).status,
    403,
  );
});
