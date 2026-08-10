import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

const api = process.env.SYS22_API_BASE ?? 'http://127.0.0.1:3297';
const system = '00000000-0000-4000-8000-000000000001';

test('SYS-22 onboarding delivery includes consumer ONE-CODE landingPath', async () => {
  const login = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@system.local',
      password: 'ChangeMe123!',
      tenantId: system,
    }),
  });
  assert.equal(login.status, 201);
  const { accessToken } = await login.json();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const slug = `s22-${stamp}`.slice(0, 32);
  const body = {
    slug,
    tenantName: `SYS22 ${stamp}`,
    organizationName: 'SYS22 HQ',
    merchantName: 'SYS22 Merchant',
    storeName: 'SYS22 Store',
    address: '88 SYS22 Road',
    phone: '021-55552200',
    businessHours: '09:00-21:00',
    adminName: 'SYS22 Owner',
    adminEmail: `${slug}@example.test`,
    adminPassword: `Sys22-${stamp}-Password!`,
    industry: 'restaurant',
    plan: 'starter',
  };
  const created = await fetch(`${api}/api/v1/platform/onboarding`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      'idempotency-key': randomUUID(),
      'x-request-id': randomUUID(),
    },
    body: JSON.stringify(body),
  });
  const payload = await created.json();
  assert.equal(created.status, 201, JSON.stringify(payload));
  const run = payload.data;
  assert.equal(run.state, 'ready');
  assert.match(run.delivery.oneCode, /^[A-Z0-9]{20}$/);
  assert.equal(run.delivery.landingPath, `/c/one-code/${run.delivery.oneCode}`);
  assert.equal(run.delivery.resolvePath, `/api/v1/one-code/${run.delivery.oneCode}`);

  const resolved = await fetch(`${api}${run.delivery.resolvePath}?role=consumer`);
  assert.equal(resolved.status, 200);
  const data = (await resolved.json()).data;
  assert.equal(data.tenant.slug, body.slug);
  assert.ok(data.targetPath.startsWith('/c/entry?tenant='));
  assert.equal(data.source, `one-code:${run.delivery.oneCode}`);
});
