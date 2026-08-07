/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test',
  base = 'http://127.0.0.1:3121',
  tenant = '00000000-0000-4000-8000-000000000001';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3121', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'page-p-001-api' },
  stdio: 'ignore',
});
const wait = (m) => new Promise((r) => setTimeout(r, m));
async function ready() {
  for (let i = 0; i < 30; i += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      /*starting*/
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
test('platform dashboard requires platform.read and returns global operational signals', async () => {
  await ready();
  assert.equal(
    (
      await fetch(`${base}/api/v1/platform/dashboard`, {
        headers: { 'x-request-id': randomUUID() },
      })
    ).status,
    401,
  );
  const token = await login();
  const r = await fetch(`${base}/api/v1/platform/dashboard`, {
    headers: { authorization: `Bearer ${token}`, 'x-request-id': randomUUID() },
  });
  assert.equal(r.status, 200);
  const d = (await r.json()).data;
  assert.equal(typeof d.metrics.tenants, 'number');
  assert.equal(typeof d.metrics.channels, 'number');
  assert.equal(d.system.database, 'available');
  assert.ok(Array.isArray(d.risks));
});
