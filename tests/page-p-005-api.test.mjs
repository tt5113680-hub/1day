/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const base = 'http://127.0.0.1:3133';
const systemTenant = '00000000-0000-4000-8000-000000000001';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3133', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'page-p-005-api' },
  stdio: 'ignore',
});
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
async function ready() {
  for (let i = 0; i < 30; i += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      /* starting */
    }
    await wait(100);
  }
  throw Error('API did not start');
}
async function login() {
  const response = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@system.local',
      password: 'ChangeMe123!',
      tenantId: systemTenant,
    }),
  });
  assert.equal(response.status, 201);
  return (await response.json()).accessToken;
}
test.after(() => api.kill());

test('platform business circles require explicit recommendation and versioned approval', async () => {
  await ready();
  const client = new Client({ connectionString: db });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const merchantTenantId = randomUUID();
  await client.query(
    "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,'Circle merchant','active',null,null)",
    [merchantTenantId, `circle-merchant-${stamp}`],
  );
  try {
    const token = await login();
    const headers = {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'x-request-id': randomUUID(),
      'idempotency-key': randomUUID(),
    };
    const body = {
      code: `district-${stamp}`,
      name: 'North District',
      description: 'Fixed merchant circle',
      merchantTenantId,
      benefits: ['Priority placement', 'Quarterly review'],
      recommendationReason: 'Verified local partner',
    };
    assert.equal(
      (
        await fetch(`${base}/api/v1/platform/business-circles`, {
          headers: { 'x-request-id': randomUUID() },
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/platform/business-circles`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ ...body, benefits: [] }),
        })
      ).status,
      400,
    );
    const created = await fetch(`${base}/api/v1/platform/business-circles`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    assert.equal(created.status, 201);
    const circle = (await created.json()).data;
    const replay = await fetch(`${base}/api/v1/platform/business-circles`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    assert.equal((await replay.json()).data.id, circle.id);
    const initial = await fetch(`${base}/api/v1/platform/business-circles`, {
      headers: { authorization: `Bearer ${token}`, 'x-request-id': randomUUID() },
    });
    const projection = (await initial.json()).data;
    const membership = projection.circles
      .find((row) => row.id === circle.id)
      .merchants.find((row) => row.tenantId === merchantTenantId);
    assert.equal(membership.approvalStatus, 'pending');
    const approveHeaders = {
      ...headers,
      'x-request-id': randomUUID(),
      'idempotency-key': randomUUID(),
    };
    const approved = await fetch(
      `${base}/api/v1/platform/business-circles/${circle.id}/merchants/${merchantTenantId}/approve`,
      {
        method: 'POST',
        headers: approveHeaders,
        body: JSON.stringify({ version: membership.version }),
      },
    );
    assert.equal(approved.status, 201);
    const approvedReplay = await fetch(
      `${base}/api/v1/platform/business-circles/${circle.id}/merchants/${merchantTenantId}/approve`,
      {
        method: 'POST',
        headers: approveHeaders,
        body: JSON.stringify({ version: membership.version }),
      },
    );
    assert.equal((await approvedReplay.json()).data.approvalStatus, 'approved');
    const counts = await client.query(
      "select (select count(*) from platform_business_circles where id=$1)::int as circles,(select count(*) from platform_business_circle_merchants where circle_id=$1 and merchant_tenant_id=$2 and approval_status='approved')::int as approved,(select count(*) from audit_logs where tenant_id=$3 and action='platform.business_circle_merchant_approved' and resource_id=$4)::int as audits,(select count(*) from outbox_events where tenant_id=$3 and event_type='platform.business_circle.merchant.approved.v1' and aggregate_id=$4)::int as outbox",
      [circle.id, merchantTenantId, systemTenant, circle.membershipId],
    );
    assert.deepEqual(counts.rows[0], { circles: 1, approved: 1, audits: 1, outbox: 1 });
  } finally {
    await client.end();
  }
});
