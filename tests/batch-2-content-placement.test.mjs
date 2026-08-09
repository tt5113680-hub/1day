/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
const base = 'http://127.0.0.1:3235',
  system = '00000000-0000-4000-8000-000000000001';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3235',
    DATABASE_URL: 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test',
    AUTH_TOKEN_SECRET: 'batch-2-content-placement',
  },
  stdio: 'ignore',
});
const wait = (n) => new Promise((r) => setTimeout(r, n)),
  h = (a, t, x = {}) => ({
    authorization: `Bearer ${a}`,
    'x-tenant-context': t,
    'x-request-id': randomUUID(),
    'content-type': 'application/json',
    ...x,
  });
async function login(email, password, tenantId) {
  const r = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, tenantId }),
  });
  assert.equal(r.status, 201);
  return (await r.json()).accessToken;
}
test.after(() => api.kill());
test('approved content is placed from the single content entity source into Consumer', async () => {
  for (let i = 0; i < 40; i += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) break;
    } catch {
      // API is starting.
    }
    await wait(100);
  }
  const n = `content-${Date.now()}`,
    admin = await login('admin@system.local', 'ChangeMe123!', system);
  const p = await fetch(`${base}/api/v1/platform/onboarding`, {
    method: 'POST',
    headers: h(admin, system, { 'idempotency-key': randomUUID() }),
    body: JSON.stringify({
      slug: n,
      tenantName: n,
      organizationName: 'Content HQ',
      merchantName: 'Content Merchant',
      storeName: 'Content Store',
      address: '1 Content Rd',
      phone: '021-5555',
      businessHours: '09:00-21:00',
      adminName: 'Content Owner',
      adminEmail: `${n}@example.test`,
      adminPassword: 'Content-Password!',
      industry: 'education',
      plan: 'starter',
    }),
  });
  assert.equal(p.status, 201);
  const run = (await p.json()).data,
    owner = await login(`${n}@example.test`, 'Content-Password!', run.tenantId),
    storeId = run.steps.find((s) => s.code === 'organization_store').output.storeId,
    title = `课程动态 ${n}`;
  const created = await fetch(`${base}/api/v1/management/content`, {
    method: 'POST',
    headers: h(owner, run.tenantId, { 'idempotency-key': randomUUID() }),
    body: JSON.stringify({ kind: 'article', title, body: '唯一内容真源' }),
  });
  assert.equal(created.status, 201);
  const item = (await created.json()).data;
  const approved = await fetch(`${base}/api/v1/management/content/${item.id}/approve`, {
    method: 'POST',
    headers: h(owner, run.tenantId),
    body: JSON.stringify({ version: item.version }),
  });
  assert.equal(approved.status, 201);
  const placed = await fetch(`${base}/api/v1/management/content/${item.id}/placements`, {
    method: 'POST',
    headers: h(owner, run.tenantId),
    body: JSON.stringify({ storeId, rank: 500 }),
  });
  assert.equal(placed.status, 201);
  const consumer = await fetch(`${base}/api/v1/consumer/stores/${storeId}?tenant=${n}`);
  assert.equal(
    (await consumer.json()).data.content.some((x) => x.title === title),
    true,
  );
});
