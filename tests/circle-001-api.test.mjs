/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const systemTenantId = '00000000-0000-4000-8000-000000000001';
const base = 'http://127.0.0.1:3151';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3151', DATABASE_URL: databaseUrl, AUTH_TOKEN_SECRET: 'circle-001' },
  stdio: 'ignore',
});
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
async function ready() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
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
      tenantId: systemTenantId,
    }),
  });
  assert.equal(response.status, 201);
  return (await response.json()).accessToken;
}

test.after(() => api.kill());
test('circle dashboard projects only approved fixed-circle merchant data', async () => {
  await ready();
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  const merchant = (
    await client.query(
      "select id from tenants where id<>$1 and status='active' and deleted_at is null limit 1",
      [systemTenantId],
    )
  ).rows[0];
  assert.ok(merchant?.id);
  const circleId = randomUUID();
  const pendingMerchantId = randomUUID();
  const pendingMerchantSlug = `circle-pending-${Date.now()}`;
  await client.query(
    "insert into tenants(id,slug,name,created_by,updated_by) values($1,$2,'Pending circle merchant',null,null)",
    [pendingMerchantId, pendingMerchantSlug],
  );
  await client.query(
    "insert into platform_business_circles(id,tenant_id,code,name,description,created_by,updated_by) values($1,$2,$3,'Circle dashboard test','Fixed circle dashboard',null,null)",
    [circleId, systemTenantId, `circle-dashboard-${Date.now()}`],
  );
  await client.query(
    "insert into platform_business_circle_merchants(id,tenant_id,circle_id,merchant_tenant_id,benefits,recommendation_reason,approval_status,created_by,updated_by) values($1,$2,$3,$4,$5,'approved test','approved',null,null)",
    [randomUUID(), systemTenantId, circleId, merchant.id, JSON.stringify(['Fixed benefit'])],
  );
  await client.query(
    "insert into platform_business_circle_merchants(id,tenant_id,circle_id,merchant_tenant_id,benefits,recommendation_reason,approval_status,created_by,updated_by) values($1,$2,$3,$4,$5,'pending test','pending',null,null)",
    [randomUUID(), systemTenantId, circleId, pendingMerchantId, JSON.stringify(['Hidden benefit'])],
  );
  try {
    assert.equal(
      (
        await fetch(`${base}/api/v1/circle/dashboard`, {
          headers: { 'x-request-id': randomUUID() },
        })
      ).status,
      401,
    );
    const response = await fetch(`${base}/api/v1/circle/dashboard`, {
      headers: { authorization: `Bearer ${await login()}`, 'x-request-id': randomUUID() },
    });
    assert.equal(response.status, 200);
    const circle = (await response.json()).data.circles.find((item) => item.id === circleId);
    assert.equal(circle.merchants.length, 1);
    assert.equal(circle.merchants[0].merchantTenantId, merchant.id);
    assert.deepEqual(circle.merchants[0].benefits, ['Fixed benefit']);
    assert.equal(typeof circle.merchants[0].trafficEvents, 'number');
    assert.equal(circle.merchants.some((item) => item.merchantTenantId === pendingMerchantId), false);
  } finally {
    await client.end();
  }
});
