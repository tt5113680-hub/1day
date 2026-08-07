/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test',
  tenant = '00000000-0000-4000-8000-000000000001',
  base = 'http://127.0.0.1:3107';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3107', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'page-m-011-api' },
  stdio: 'ignore',
});
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function ready() {
  for (let i = 0; i < 30; i += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      // Starting.
    }
    await pause(100);
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
test('employee process performance stays tenant-scoped and uses multi-signal process metrics', async () => {
  await ready();
  const token = await login(),
    headers = { authorization: `Bearer ${token}`, 'x-request-id': randomUUID() };
  assert.equal(
    (
      await fetch(`${base}/api/v1/management/employee-process-performance`, {
        headers: { 'x-request-id': randomUUID() },
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await fetch(`${base}/api/v1/management/employee-process-performance`, {
        headers: { ...headers, 'x-tenant-context': randomUUID() },
      })
    ).status,
    403,
  );
  const response = await fetch(`${base}/api/v1/management/employee-process-performance`, {
    headers,
  });
  assert.equal(response.status, 200);
  const data = (await response.json()).data;
  assert.ok(Array.isArray(data.employees));
  if (data.employees.length)
    for (const employee of data.employees) {
      assert.equal(typeof employee.followUps, 'number');
      assert.equal(typeof employee.evidenceLinks, 'number');
      assert.equal(typeof employee.contributionOrders, 'number');
      assert.equal(typeof employee.coaching, 'string');
    }
});
