/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const base = 'http://127.0.0.1:3130';
const systemTenant = '00000000-0000-4000-8000-000000000001';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3130', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'page-p-004-api' },
  stdio: 'ignore',
});
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
async function ready() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      // API is starting.
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

test('platform channels protect and persist first-level merchant pool records', async () => {
  await ready();
  const client = new Client({ connectionString: db });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const merchantTenantId = randomUUID();
  const merchantSlug = `channel-merchant-${stamp}`;
  await client.query(
    "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,'Channel merchant','active',null,null)",
    [merchantTenantId, merchantSlug],
  );
  try {
    const token = await login();
    const body = {
      code: `partner-${stamp}`,
      name: 'Regional partner',
      merchantTenantId,
      onboardingStatus: 'onboarding',
      serviceStatus: 'ready',
    };
    assert.equal(
      (
        await fetch(`${base}/api/v1/platform/channels`, {
          headers: { 'x-request-id': randomUUID() },
        })
      ).status,
      401,
    );
    const headers = {
      authorization: `Bearer ${token}`,
      'x-request-id': randomUUID(),
      'idempotency-key': randomUUID(),
      'content-type': 'application/json',
    };
    assert.equal(
      (
        await fetch(`${base}/api/v1/platform/channels`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ ...body, code: 'Bad Code' }),
        })
      ).status,
      400,
    );
    const created = await fetch(`${base}/api/v1/platform/channels`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    assert.equal(created.status, 201);
    const data = (await created.json()).data;
    const replay = await fetch(`${base}/api/v1/platform/channels`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    assert.equal(replay.status, 201);
    assert.equal((await replay.json()).data.id, data.id);
    const listed = await fetch(`${base}/api/v1/platform/channels`, {
      headers: { authorization: `Bearer ${token}`, 'x-request-id': randomUUID() },
    });
    assert.equal(listed.status, 200);
    const projection = (await listed.json()).data;
    assert.equal(
      projection.merchantPool.some((row) => row.tenantId === merchantTenantId),
      true,
    );
    assert.equal(
      projection.channels.some(
        (row) => row.id === data.id && row.merchants[0].tenantId === merchantTenantId,
      ),
      true,
    );
    const counts = await client.query(
      "select (select count(*) from platform_channels where id=$1)::int as channels,(select count(*) from platform_channel_merchants where channel_id=$1 and merchant_tenant_id=$2)::int as links,(select count(*) from audit_logs where tenant_id=$3 and action='platform.channel_created' and resource_id=$1)::int as audits,(select count(*) from outbox_events where tenant_id=$3 and event_type='platform.channel.created.v1' and aggregate_id=$1)::int as outbox",
      [data.id, merchantTenantId, systemTenant],
    );
    assert.deepEqual(counts.rows[0], { channels: 1, links: 1, audits: 1, outbox: 1 });
  } finally {
    await client.end();
  }
});
