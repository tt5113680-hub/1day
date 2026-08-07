/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test',
  tenant = '00000000-0000-4000-8000-000000000001',
  base = 'http://127.0.0.1:3109';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3109', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'page-m-012-api' },
  stdio: 'ignore',
});
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function ready() {
  for (let i = 0; i < 30; i += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      /* starting */
    }
    await wait(100);
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
test('management attribution is tenant-scoped and retains role and evidence level', async () => {
  await ready();
  const token = await login(),
    headers = { authorization: `Bearer ${token}`, 'x-request-id': randomUUID() };
  assert.equal(
    (
      await fetch(`${base}/api/v1/management/attribution`, {
        headers: { 'x-request-id': randomUUID() },
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await fetch(`${base}/api/v1/management/attribution`, {
        headers: { ...headers, 'x-tenant-context': randomUUID() },
      })
    ).status,
    403,
  );
  const r = await fetch(`${base}/api/v1/management/attribution`, { headers });
  assert.equal(r.status, 200);
  const data = (await r.json()).data;
  assert.ok(Array.isArray(data.records));
  for (const row of data.records) {
    assert.ok(['first_source', 'current_source', 'final_source'].includes(row.role));
    assert.ok(['confirmed', 'recorded', 'source_only'].includes(row.evidenceLevel));
  }
});
