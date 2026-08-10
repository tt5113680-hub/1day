/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const base = 'http://127.0.0.1:3279';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const systemTenantId = '00000000-0000-4000-8000-000000000001';

const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3279',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'sys-6-role-matrix-member',
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

test('SYS-6 Role matrix E2E slice: Member Consumer journey (enroll → proof → denials)', async () => {
  await ready();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const slug = `sys6-rm-member-${stamp}`;
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
      tenantName: `SYS6 Member ${stamp}`,
      organizationName: 'Member HQ',
      merchantName: 'Member Merchant',
      storeName: 'Member Store',
      address: 'Member Road 1',
      phone: '021-6000',
      businessHours: '09:00-21:00',
      adminName: 'Member Owner',
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

  assert.equal(
    (
      await fetch(
        `${base}/api/v1/consumer/memberships/wallet?tenant=${encodeURIComponent(slug)}&accessId=${randomUUID()}&access=bad`,
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await fetch(
        `${base}/api/v1/consumer/profile/${randomUUID()}?tenant=${encodeURIComponent(slug)}&access=bad`,
      )
    ).status,
    404,
  );

  const enroll = await fetch(
    `${base}/api/v1/consumer/memberships/enroll?tenant=${encodeURIComponent(slug)}`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': randomUUID(),
        'x-request-id': randomUUID(),
      },
      body: JSON.stringify({
        storeId,
        phone: `138${String(stamp).slice(-8)}`,
        consent: true,
      }),
    },
  );
  assert.equal(enroll.status, 201);
  const member = (await enroll.json()).data;
  assert.ok(member.memberCode);
  assert.ok(member.profileAccessId);
  assert.ok(member.profileAccess);

  const wallet = await fetch(
    `${base}/api/v1/consumer/memberships/wallet?tenant=${encodeURIComponent(slug)}&accessId=${encodeURIComponent(member.profileAccessId)}&access=${encodeURIComponent(member.profileAccess)}`,
  );
  assert.equal(wallet.status, 200);
  const walletData = (await wallet.json()).data;
  assert.equal(walletData.memberCode, member.memberCode);

  const profile = await fetch(
    `${base}/api/v1/consumer/profile/${encodeURIComponent(member.profileAccessId)}?tenant=${encodeURIComponent(slug)}&access=${encodeURIComponent(member.profileAccess)}`,
  );
  assert.equal(profile.status, 200);
  const profileData = (await profile.json()).data;
  assert.ok(profileData.profile.identities.some((item) => item.type === 'phone'));
  assert.ok(!JSON.stringify(profileData).includes(`138${String(stamp).slice(-8)}`));

  assert.equal(
    (
      await fetch(
        `${base}/api/v1/consumer/memberships/wallet?tenant=${encodeURIComponent(slug)}&accessId=${encodeURIComponent(member.profileAccessId)}&access=wrong`,
      )
    ).status,
    404,
  );

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const enrollment = await client.query(
      'select id from membership_enrollments where tenant_id=$1 and member_code=$2 and deleted_at is null limit 1',
      [tenantId, member.memberCode],
    );
    assert.equal(enrollment.rowCount, 1);
  } finally {
    await client.end();
  }
});
