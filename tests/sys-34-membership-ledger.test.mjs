/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { Client } from '../apps/api/node_modules/pg/esm/index.mjs';

const apiBase = 'http://127.0.0.1:3357';
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3357',
    DATABASE_URL: db,
    AUTH_TOKEN_SECRET: 'sys-34-membership-ledger',
  },
  stdio: 'ignore',
});

const headers = (token, key) => ({
  authorization: `Bearer ${token}`,
  'content-type': 'application/json',
  'x-request-id': randomUUID(),
  ...(key ? { 'idempotency-key': key } : {}),
});

async function ready() {
  for (let i = 0; i < 40; i += 1) {
    try {
      if ((await fetch(`${apiBase}/api/v1/health`)).ok) return;
    } catch {
      /* waiting */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw Error('API did not start');
}

async function seed() {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const tenantId = '00000000-0000-4000-8000-000000000001';
  const customerId = randomUUID();
  const enrollmentId = randomUUID();
  const benefitId = randomUUID();
  const memberCode = `A${stamp}`.slice(0, 12).toUpperCase().padEnd(12, '0');
  const client = new Client({ connectionString: db });
  await client.connect();
  try {
    const store = await client.query(
      "select id from stores where tenant_id=$1 and status='active' and deleted_at is null limit 1",
      [tenantId],
    );
    if (!store.rows[0]) throw new Error('No store in system tenant');
    const storeId = store.rows[0].id;
    await client.query(
      'insert into customers(id,tenant_id,display_name,created_by,updated_by) values($1,$2,$3,null,null)',
      [customerId, tenantId, `SYS34 Member ${stamp}`],
    );
    await client.query(
      "insert into membership_enrollments(id,tenant_id,customer_id,store_id,member_code,enrollment_status,source,joined_at,created_by,updated_by) values($1,$2,$3,$4,$5,'active','sys34',now(),null,null)",
      [enrollmentId, tenantId, customerId, storeId, memberCode],
    );
    await client.query(
      "insert into store_benefits(id,tenant_id,store_id,title,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null)",
      [benefitId, tenantId, storeId, `SYS34 Benefit ${stamp}`],
    );
  } finally {
    await client.end();
  }
  return { enrollmentId, benefitId, memberCode, tenantId };
}

test.after(() => api.kill());

test('SYS-34 membership ledger and revoke close the grant timeline', async () => {
  await ready();
  const seeded = await seed();
  const login = await fetch(`${apiBase}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@system.local',
      password: 'ChangeMe123!',
      tenantId: seeded.tenantId,
    }),
  });
  assert.equal(login.status, 201);
  const token = (await login.json()).accessToken;

  const grant = await fetch(
    `${apiBase}/api/v1/management/memberships/${seeded.enrollmentId}/grants`,
    {
      method: 'POST',
      headers: headers(token, `sys34-grant-${seeded.enrollmentId}`),
      body: JSON.stringify({ benefitId: seeded.benefitId, quantity: 2 }),
    },
  );
  assert.equal(grant.status, 201, JSON.stringify(await grant.clone().json()));

  const ledger1 = await fetch(
    `${apiBase}/api/v1/management/memberships/${seeded.enrollmentId}/ledger`,
    { headers: headers(token) },
  );
  assert.equal(ledger1.status, 200);
  const ledger1Data = await ledger1.json();
  assert.ok(ledger1Data.data.entries.some((row) => row.entry_type === 'grant'));
  const balanceAfterGrant = ledger1Data.data.balances.find(
    (row) => row.benefit_id === seeded.benefitId,
  );
  assert.equal(balanceAfterGrant.balance, 2);

  const revoke = await fetch(
    `${apiBase}/api/v1/management/memberships/${seeded.enrollmentId}/revokes`,
    {
      method: 'POST',
      headers: headers(token, `sys34-revoke-${seeded.enrollmentId}`),
      body: JSON.stringify({ benefitId: seeded.benefitId, quantity: 1 }),
    },
  );
  const revokePayload = await revoke.json();
  assert.equal(revoke.status, 201, JSON.stringify(revokePayload));
  assert.equal(revokePayload.data.entry_type, 'revoke');
  assert.equal(revokePayload.data.balance_after, 1);

  const ledger2 = await fetch(
    `${apiBase}/api/v1/management/memberships/${seeded.enrollmentId}/ledger`,
    { headers: headers(token) },
  );
  const ledger2Data = await ledger2.json();
  assert.ok(ledger2Data.data.entries.some((row) => row.entry_type === 'revoke'));
  assert.equal(
    ledger2Data.data.balances.find((row) => row.benefit_id === seeded.benefitId).balance,
    1,
  );
});
