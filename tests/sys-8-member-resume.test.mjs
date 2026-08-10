/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const base = 'http://127.0.0.1:3291';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const systemTenantId = '00000000-0000-4000-8000-000000000001';

const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3291',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'sys-8-member-resume',
  },
  stdio: 'ignore',
});

async function ready() {
  for (let i = 0; i < 60; i += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      // starting
    }
    await wait(100);
  }
  throw new Error('API not ready');
}

async function login(email, password, tenantId) {
  const response = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, tenantId }),
  });
  assert.equal(response.status, 201);
  return (await response.json()).accessToken;
}

test.after(() => api.kill());

test('SYS-8 cross-device Member resume: revoke prior access, issue new wallet session', async () => {
  await ready();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const slug = `sys8-resume-${stamp}`;
  const phone = `137${String(stamp).slice(-8)}`;
  const platformToken = await login('admin@system.local', 'ChangeMe123!', systemTenantId);
  const provision = await fetch(`${base}/api/v1/platform/onboarding`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${platformToken}`,
      'x-request-id': randomUUID(),
      'idempotency-key': randomUUID(),
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      slug,
      tenantName: `SYS8 Resume ${stamp}`,
      organizationName: 'Resume HQ',
      merchantName: 'Resume Merchant',
      storeName: 'Resume Store',
      address: 'Resume Road 1',
      phone: '021-8000',
      businessHours: '09:00-21:00',
      adminName: 'Resume Owner',
      adminEmail: `owner-${stamp}@example.local`,
      adminPassword: 'ChangeMe123!',
      industry: 'retail',
      plan: 'starter',
    }),
  });
  assert.equal(provision.status, 201);
  const run = (await provision.json()).data;
  const storeId = run.steps.find((step) => step.code === 'organization_store').output.storeId;
  const tenantId = run.tenantId;

  const enroll = await fetch(
    `${base}/api/v1/consumer/memberships/enroll?tenant=${encodeURIComponent(slug)}`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': randomUUID(),
      },
      body: JSON.stringify({ storeId, phone, consent: true }),
    },
  );
  assert.equal(enroll.status, 201);
  const first = (await enroll.json()).data;
  assert.ok(first.memberCode);
  assert.ok(first.profileAccessId);
  assert.ok(first.profileAccess);

  const firstWallet = await fetch(
    `${base}/api/v1/consumer/memberships/wallet?tenant=${encodeURIComponent(slug)}&accessId=${encodeURIComponent(first.profileAccessId)}&access=${encodeURIComponent(first.profileAccess)}`,
  );
  assert.equal(firstWallet.status, 200);

  assert.equal(
    (
      await fetch(`${base}/api/v1/consumer/memberships/resume?tenant=${encodeURIComponent(slug)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': randomUUID() },
        body: JSON.stringify({
          storeId,
          phone,
          memberCode: first.memberCode,
          consent: false,
        }),
      })
    ).status,
    400,
  );

  assert.equal(
    (
      await fetch(`${base}/api/v1/consumer/memberships/resume?tenant=${encodeURIComponent(slug)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': randomUUID() },
        body: JSON.stringify({
          storeId,
          phone,
          memberCode: 'ZZZZZZZZZZZZ',
          consent: true,
        }),
      })
    ).status,
    400,
  );

  assert.equal(
    (
      await fetch(`${base}/api/v1/consumer/memberships/resume?tenant=${encodeURIComponent(slug)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': randomUUID() },
        body: JSON.stringify({
          storeId,
          phone,
          memberCode: 'ABCDEF123456',
          consent: true,
        }),
      })
    ).status,
    404,
  );

  const resumeKey = randomUUID();
  const resume = () =>
    fetch(`${base}/api/v1/consumer/memberships/resume?tenant=${encodeURIComponent(slug)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': resumeKey },
      body: JSON.stringify({
        storeId,
        phone,
        memberCode: first.memberCode,
        consent: true,
      }),
    });
  const resumed = await resume();
  assert.equal(resumed.status, 201);
  const second = (await resumed.json()).data;
  assert.equal(second.enrollmentId, first.enrollmentId);
  assert.equal(second.memberCode, first.memberCode);
  assert.equal(second.resumed, true);
  assert.notEqual(second.profileAccessId, first.profileAccessId);
  assert.notEqual(second.profileAccess, first.profileAccess);

  const replay = await resume();
  assert.equal(replay.status, 201);
  assert.equal((await replay.json()).data.profileAccessId, second.profileAccessId);

  assert.equal(
    (
      await fetch(
        `${base}/api/v1/consumer/memberships/wallet?tenant=${encodeURIComponent(slug)}&accessId=${encodeURIComponent(first.profileAccessId)}&access=${encodeURIComponent(first.profileAccess)}`,
      )
    ).status,
    404,
  );

  const secondWallet = await fetch(
    `${base}/api/v1/consumer/memberships/wallet?tenant=${encodeURIComponent(slug)}&accessId=${encodeURIComponent(second.profileAccessId)}&access=${encodeURIComponent(second.profileAccess)}`,
  );
  assert.equal(secondWallet.status, 200);
  assert.equal((await secondWallet.json()).data.memberCode, first.memberCode);

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const revoked = await client.query(
      "select status,consent_status from consumer_profile_accesses where id=$1 and tenant_id=$2",
      [first.profileAccessId, tenantId],
    );
    assert.equal(revoked.rowCount, 1);
    assert.equal(revoked.rows[0].status, 'revoked');
    assert.equal(revoked.rows[0].consent_status, 'revoked');
    const active = await client.query(
      "select status from consumer_profile_accesses where id=$1 and tenant_id=$2",
      [second.profileAccessId, tenantId],
    );
    assert.equal(active.rows[0].status, 'active');
    const audits = await client.query(
      "select action from audit_logs where tenant_id=$1 and action='membership.resumed' and resource_id=$2",
      [tenantId, first.enrollmentId],
    );
    assert.ok(audits.rowCount >= 1);
  } finally {
    await client.end();
  }
});
