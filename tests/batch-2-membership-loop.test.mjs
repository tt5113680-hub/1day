import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

const base = 'http://127.0.0.1:3230';
const systemTenant = '00000000-0000-4000-8000-000000000001';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3230',
    DATABASE_URL: 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test',
    AUTH_TOKEN_SECRET: 'batch-2-membership-loop',
  },
  stdio: 'ignore',
});
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const headers = (token, tenant, more = {}) => ({
  authorization: `Bearer ${token}`,
  'x-tenant-context': tenant,
  'x-request-id': randomUUID(),
  'content-type': 'application/json',
  ...more,
});
async function ready() {
  for (let i = 0; i < 40; i += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {}
    await wait(100);
  }
  throw Error('API did not start');
}
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

test('consumer enrollment, owner grant, employee redemption and wallet are tenant isolated', async () => {
  await ready();
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`,
    slug = `member-${suffix}`,
    email = `${slug}@example.test`,
    password = `Member-${suffix}-Password!`;
  const system = await login('admin@system.local', 'ChangeMe123!', systemTenant);
  const provision = await fetch(`${base}/api/v1/platform/onboarding`, {
    method: 'POST',
    headers: headers(system, systemTenant, { 'idempotency-key': randomUUID() }),
    body: JSON.stringify({
      slug,
      tenantName: `Member ${suffix}`,
      organizationName: 'Member HQ',
      merchantName: 'Member Merchant',
      storeName: 'Member Store',
      address: '50 Member Road',
      phone: '021-55555000',
      businessHours: '09:00-21:00',
      adminName: 'Member Owner',
      adminEmail: email,
      adminPassword: password,
      industry: 'beauty',
      plan: 'starter',
    }),
  });
  assert.equal(provision.status, 201);
  const run = (await provision.json()).data,
    owner = await login(email, password, run.tenantId);
  const storeId = run.steps.find((step) => step.code === 'organization_store').output.storeId;
  const enrollKey = randomUUID();
  const enroll = () =>
    fetch(`${base}/api/v1/consumer/memberships/enroll?tenant=${slug}`, {
      method: 'POST',
      headers: { 'idempotency-key': enrollKey, 'content-type': 'application/json' },
      body: JSON.stringify({ storeId, phone: '13800138000', consent: true }),
    });
  const enrolled = await enroll();
  assert.equal(enrolled.status, 201);
  const member = (await enrolled.json()).data;
  const replay = await enroll();
  assert.equal((await replay.json()).data.enrollmentId, member.enrollmentId);
  const list = await fetch(`${base}/api/v1/management/memberships`, {
    headers: headers(owner, run.tenantId),
  });
  assert.equal(list.status, 200);
  const benefit = (await list.json()).data.benefits[0];
  assert.ok(benefit?.id);
  const grant = await fetch(`${base}/api/v1/management/memberships/${member.enrollmentId}/grants`, {
    method: 'POST',
    headers: headers(owner, run.tenantId, { 'idempotency-key': randomUUID() }),
    body: JSON.stringify({ benefitId: benefit.id, quantity: 2 }),
  });
  assert.equal(grant.status, 201);
  const wallet = () =>
    fetch(
      `${base}/api/v1/consumer/memberships/wallet?tenant=${slug}&accessId=${member.profileAccessId}&access=${member.profileAccess}`,
    );
  let result = await wallet();
  assert.equal(result.status, 200);
  assert.equal((await result.json()).data.benefits[0].balance, 2);
  const redeem = await fetch(`${base}/api/v1/employee/memberships/redeem`, {
    method: 'POST',
    headers: headers(owner, run.tenantId, { 'idempotency-key': randomUUID() }),
    body: JSON.stringify({ memberCode: member.memberCode, benefitId: benefit.id }),
  });
  assert.equal(redeem.status, 201);
  result = await wallet();
  assert.equal((await result.json()).data.benefits[0].balance, 1);
  const cross = await fetch(`${base}/api/v1/consumer/memberships/enroll?tenant=system`, {
    method: 'POST',
    headers: { 'idempotency-key': randomUUID(), 'content-type': 'application/json' },
    body: JSON.stringify({ storeId, phone: '13800138001', consent: true }),
  });
  assert.equal(cross.status, 404);
});
