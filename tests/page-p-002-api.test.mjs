/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test',
  base = 'http://127.0.0.1:3123',
  tenant = '00000000-0000-4000-8000-000000000001';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3123', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'page-p-002-api' },
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
test('platform tenant lifecycle requires scoped permission, confirmation, version and idempotency', async () => {
  await ready();
  const token = await login(),
    headers = {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'x-request-id': randomUUID(),
    };
  assert.equal(
    (await fetch(`${base}/api/v1/platform/tenants`, { headers: { 'x-request-id': randomUUID() } }))
      .status,
    401,
  );
  const listed = await fetch(`${base}/api/v1/platform/tenants`, { headers });
  assert.equal(listed.status, 200);
  const target = (await listed.json()).data.find((x) => x.slug === 'system');
  const payload = {
    version: target.version,
    status: 'active',
    plan: 'growth',
    quotas: { users: 50, customers: 5000, stores: 10 },
    riskLevel: 'medium',
    confirmation: `ACTIVATE:${target.slug}`,
  };
  const key = randomUUID();
  const write = (body = payload, idempotencyKey = key) =>
    fetch(`${base}/api/v1/platform/tenants/${target.id}`, {
      method: 'PUT',
      headers: { ...headers, 'idempotency-key': idempotencyKey },
      body: JSON.stringify(body),
    });
  assert.equal((await write({ ...payload, confirmation: 'wrong' }, randomUUID())).status, 400);
  const saved = await write();
  assert.equal(saved.status, 200);
  const row = (await saved.json()).data;
  assert.equal(row.plan, 'growth');
  assert.equal((await write()).status, 200);
  assert.equal((await write(payload, randomUUID())).status, 409);
});
