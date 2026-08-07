/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test',
  tenant = '00000000-0000-4000-8000-000000000001',
  base = 'http://127.0.0.1:3111';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3111', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'page-m-013-api' },
  stdio: 'ignore',
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
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
test('content is tenant scoped, approved and only queued for channel authorization', async () => {
  await ready();
  const token = await login(),
    headers = {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'x-request-id': randomUUID(),
    };
  assert.equal(
    (
      await fetch(`${base}/api/v1/management/content`, {
        headers: { 'x-request-id': randomUUID() },
      })
    ).status,
    401,
  );
  const created = await fetch(`${base}/api/v1/management/content`, {
    method: 'POST',
    headers: { ...headers, 'idempotency-key': randomUUID() },
    body: JSON.stringify({ kind: 'article', title: `Content ${Date.now()}` }),
  });
  assert.equal(created.status, 201);
  const item = (await created.json()).data;
  assert.equal(
    (
      await fetch(`${base}/api/v1/management/content/${item.id}/approve`, {
        method: 'POST',
        headers: { ...headers, 'x-tenant-context': randomUUID() },
        body: JSON.stringify({ version: item.version }),
      })
    ).status,
    403,
  );
  const approved = await fetch(`${base}/api/v1/management/content/${item.id}/approve`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ version: item.version }),
  });
  assert.equal(approved.status, 201);
  const distribution = await fetch(`${base}/api/v1/management/content/${item.id}/distributions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ version: (await approved.json()).data.version, channel: 'douyin' }),
  });
  assert.equal(distribution.status, 201);
  assert.equal((await distribution.json()).data.status, 'pending_authorization');
});
