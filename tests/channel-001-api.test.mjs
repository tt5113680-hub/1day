/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const base = 'http://127.0.0.1:3145';
const systemTenantId = '00000000-0000-4000-8000-000000000001';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3145',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'channel-001',
  },
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
async function token() {
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
test('channel dashboard reports persisted merchant onboarding, activity and renewal opportunity signals', async () => {
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
  const channelId = randomUUID();
  const membershipId = randomUUID();
  await client.query(
    "insert into platform_channels(id,tenant_id,code,name,onboarding_status,service_status,created_by,updated_by) values($1,$2,$3,'Channel dashboard test','open','ready',null,null)",
    [channelId, systemTenantId, `channel-dashboard-${Date.now()}`],
  );
  await client.query(
    "insert into platform_channel_merchants(id,tenant_id,channel_id,merchant_tenant_id,onboarding_status,service_status,created_by,updated_by) values($1,$2,$3,$4,'active','ready',null,null)",
    [membershipId, systemTenantId, channelId, merchant.id],
  );
  try {
    assert.equal(
      (
        await fetch(`${base}/api/v1/channel/dashboard`, {
          headers: { 'x-request-id': randomUUID() },
        })
      ).status,
      401,
    );
    const response = await fetch(`${base}/api/v1/channel/dashboard`, {
      headers: { authorization: `Bearer ${await token()}`, 'x-request-id': randomUUID() },
    });
    assert.equal(response.status, 200);
    const data = (await response.json()).data;
    const row = data.merchants.find((item) => item.membershipId === membershipId);
    assert.equal(row.onboardingStatus, 'active');
    assert.equal(typeof row.activeIn30Days, 'boolean');
    assert.ok(['inactive_30d', 'high_risk', null].includes(row.renewalSignal));
    assert.ok(data.metrics.merchant_count >= 1);
  } finally {
    await client.end();
  }
});
