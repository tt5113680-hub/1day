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
const base = 'http://127.0.0.1:3148';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3148',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'channel-002',
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
test('channel merchant onboarding is atomic, idempotent and recovers delivery state', async () => {
  await ready();
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  const channelId = randomUUID();
  await client.query(
    "insert into platform_channels(id,tenant_id,code,name,onboarding_status,service_status,created_by,updated_by) values($1,$2,$3,'Channel onboarding test','open','ready',null,null)",
    [channelId, systemTenantId, `channel-onboarding-${Date.now()}`],
  );
  try {
    const token = await login(),
      suffix = Date.now(),
      key = randomUUID();
    const body = {
      channelId,
      slug: `channel-merchant-${suffix}`,
      tenantName: `Channel Merchant ${suffix}`,
      organizationName: 'HQ',
      storeName: 'Main',
      adminName: 'Owner',
      adminEmail: `channel-owner-${suffix}@example.test`,
      adminPassword: `Channel-${suffix}-Password!`,
      template: 'starter',
      plan: 'growth',
    };
    const headers = {
      authorization: `Bearer ${token}`,
      'x-request-id': randomUUID(),
      'idempotency-key': key,
      'content-type': 'application/json',
    };
    assert.equal(
      (
        await fetch(`${base}/api/v1/channel/merchant-onboardings`, {
          headers: { 'x-request-id': randomUUID() },
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/channel/merchant-onboardings`, {
          method: 'POST',
          headers: { ...headers, 'idempotency-key': randomUUID() },
          body: JSON.stringify({ ...body, plan: 'invalid' }),
        })
      ).status,
      400,
    );
    const first = await fetch(`${base}/api/v1/channel/merchant-onboardings`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    assert.equal(first.status, 201);
    const created = (await first.json()).data;
    const replay = await fetch(`${base}/api/v1/channel/merchant-onboardings`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    assert.equal((await replay.json()).data.tenantId, created.tenantId);
    const failed = await fetch(
      `${base}/api/v1/channel/merchant-onboardings/${created.id}/delivery`,
      {
        method: 'POST',
        headers: { ...headers, 'idempotency-key': randomUUID() },
        body: JSON.stringify({
          status: 'failed',
          note: 'Delivery contact unavailable.',
          version: 1,
        }),
      },
    );
    assert.equal(failed.status, 201, await failed.text());
    const retry = await fetch(
      `${base}/api/v1/channel/merchant-onboardings/${created.id}/delivery`,
      {
        method: 'POST',
        headers: { ...headers, 'idempotency-key': randomUUID() },
        body: JSON.stringify({
          status: 'delivered',
          note: 'Delivery completed after retry.',
          version: 2,
        }),
      },
    );
    assert.equal((await retry.json()).data.delivery_status, 'delivered');
    const counts = await client.query(
      "select (select count(*) from platform_channel_merchants where tenant_id=$1 and channel_id=$2 and merchant_tenant_id=$3)::int memberships,(select count(*) from channel_merchant_onboardings where tenant_id=$1 and id=$4 and delivery_status='delivered')::int onboardings,(select count(*) from platform_tenant_settings where tenant_id=$3 and plan='growth')::int plans,(select count(*) from audit_logs where tenant_id=$1 and resource_id=$4)::int audits,(select count(*) from outbox_events where tenant_id=$1 and aggregate_id=$4)::int outbox",
      [systemTenantId, channelId, created.tenantId, created.id],
    );
    assert.deepEqual(counts.rows[0], {
      memberships: 1,
      onboardings: 1,
      plans: 1,
      audits: 3,
      outbox: 3,
    });
  } finally {
    await client.end();
  }
});
