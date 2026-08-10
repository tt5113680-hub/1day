/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

const apiBase = 'http://127.0.0.1:3353';
const tenant = '00000000-0000-4000-8000-000000000001';
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3353',
    DATABASE_URL: db,
    AUTH_TOKEN_SECRET: 'sys-32-external-actions-lifecycle',
  },
  stdio: 'ignore',
});

const headers = (token, key) => ({
  authorization: `Bearer ${token}`,
  'content-type': 'application/json',
  'x-request-id': randomUUID(),
  ...(key ? { 'idempotency-key': key } : {}),
});

async function ready() {
  for (let i = 0; i < 40; i += 1) {
    try {
      if ((await fetch(`${apiBase}/api/v1/health`)).ok) return;
    } catch {
      /* waiting */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw Error('API did not start');
}

test.after(() => api.kill());

test('SYS-32 external-actions update and soft-delete archive', async () => {
  await ready();
  const login = await fetch(`${apiBase}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@system.local',
      password: 'ChangeMe123!',
      tenantId: tenant,
    }),
  });
  assert.equal(login.status, 201);
  const token = (await login.json()).accessToken;
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const code = `sys32-${stamp}`.slice(0, 32);
  const created = await fetch(`${apiBase}/api/v1/external-actions`, {
    method: 'POST',
    headers: headers(token, `sys32-${stamp}`),
    body: JSON.stringify({
      code,
      name: `SYS32 Link ${stamp}`,
      actionType: 'link',
      targetUrl: 'https://example.test/sys32',
      platform: 'external',
    }),
  });
  const createdPayload = await created.json();
  assert.equal(created.status, 201, JSON.stringify(createdPayload));
  const id = createdPayload.data.id;
  const version = createdPayload.data.version;

  const updated = await fetch(`${apiBase}/api/v1/external-actions/${id}`, {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify({
      name: `SYS32 Updated ${stamp}`,
      targetUrl: 'https://example.test/sys32-updated',
      platform: 'external',
      version,
    }),
  });
  const updatedPayload = await updated.json();
  assert.equal(updated.status, 200, JSON.stringify(updatedPayload));
  assert.equal(updatedPayload.data.name, `SYS32 Updated ${stamp}`);
  assert.equal(updatedPayload.data.target_url, 'https://example.test/sys32-updated');
  assert.equal(updatedPayload.data.code, code);
  assert.equal(updatedPayload.data.version, version + 1);

  const stale = await fetch(`${apiBase}/api/v1/external-actions/${id}`, {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify({
      name: 'stale',
      targetUrl: 'https://example.test/stale',
      version,
    }),
  });
  assert.equal(stale.status, 409);

  const archived = await fetch(`${apiBase}/api/v1/external-actions/${id}`, {
    method: 'DELETE',
    headers: headers(token),
    body: JSON.stringify({ version: version + 1 }),
  });
  const archivedPayload = await archived.json();
  assert.equal(archived.status, 200, JSON.stringify(archivedPayload));
  assert.equal(archivedPayload.data.status, 'archived');
  assert.ok(archivedPayload.data.deleted_at);
  assert.notEqual(archivedPayload.data.code, code);

  const listed = await fetch(`${apiBase}/api/v1/external-actions`, {
    headers: headers(token),
  });
  assert.equal(listed.status, 200);
  const rows = (await listed.json()).data;
  assert.ok(!rows.some((row) => row.id === id));

  const recreated = await fetch(`${apiBase}/api/v1/external-actions`, {
    method: 'POST',
    headers: headers(token, `sys32-re-${stamp}`),
    body: JSON.stringify({
      code,
      name: `SYS32 Recreate ${stamp}`,
      actionType: 'link',
      targetUrl: 'https://example.test/sys32-re',
    }),
  });
  assert.equal(recreated.status, 201, JSON.stringify(await recreated.json()));
});
