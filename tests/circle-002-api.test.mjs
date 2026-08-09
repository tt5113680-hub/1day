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
const base = 'http://127.0.0.1:3154';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3154', DATABASE_URL: databaseUrl, AUTH_TOKEN_SECRET: 'circle-002' },
  stdio: 'ignore',
});
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
async function ready() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      // API is still starting.
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
const request = (token, path, method = 'GET', body, key = randomUUID()) =>
  fetch(`${base}/api/v1/circle/merchants${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      'x-request-id': randomUUID(),
      ...(method === 'GET' ? {} : { 'idempotency-key': key, 'content-type': 'application/json' }),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

test.after(() => api.kill());
test('circle invitation requires circle review, platform review, configuration and auditable exit', async () => {
  await ready();
  const token = await login();
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
  await client.query(
    "insert into platform_business_circles(id,tenant_id,code,name,description,created_by,updated_by) values($1,$2,$3,'Circle membership flow','Circle membership flow',null,null)",
    [circleId, systemTenantId, `circle-membership-${Date.now()}`],
  );
  try {
    assert.equal(
      (
        await fetch(`${base}/api/v1/circle/merchants`, {
          headers: { 'x-request-id': randomUUID() },
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await request(token, '/invitations', 'POST', {
          circleId,
          merchantTenantId: merchant.id,
          benefits: [],
          invitationNote: 'x',
          displayConfig: { visible: true, sortOrder: 0 },
        })
      ).status,
      400,
    );
    const invitationKey = randomUUID();
    const invite = await request(
      token,
      '/invitations',
      'POST',
      {
        circleId,
        merchantTenantId: merchant.id,
        benefits: ['Member benefit'],
        invitationNote: 'Prepared only',
        displayConfig: { visible: true, sortOrder: 3, headline: 'Featured' },
      },
      invitationKey,
    );
    assert.equal(invite.status, 201);
    const invited = (await invite.json()).data;
    assert.equal(invited.invitationStatus, 'prepared');
    assert.equal(invited.circleApprovalStatus, 'pending');
    const replay = await request(
      token,
      '/invitations',
      'POST',
      {
        circleId,
        merchantTenantId: merchant.id,
        benefits: ['Member benefit'],
        invitationNote: 'Prepared only',
        displayConfig: { visible: true, sortOrder: 3, headline: 'Featured' },
      },
      invitationKey,
    );
    assert.equal(replay.status, 201);
    assert.equal((await replay.json()).data.id, invited.id);
    assert.equal(
      (
        await request(token, `/${invited.id}/platform-approve`, 'POST', {
          version: invited.version,
        })
      ).status,
      409,
    );
    const circleApproved = await request(token, `/${invited.id}/circle-approve`, 'POST', {
      version: invited.version,
    });
    assert.equal(circleApproved.status, 201);
    const afterCircle = (await circleApproved.json()).data;
    assert.equal(afterCircle.circleApprovalStatus, 'approved');
    const platformApproved = await request(token, `/${invited.id}/platform-approve`, 'POST', {
      version: afterCircle.version,
    });
    assert.equal(platformApproved.status, 201);
    const afterPlatform = (await platformApproved.json()).data;
    assert.equal(afterPlatform.platformApprovalStatus, 'approved');
    const accepted = await client.query(
      'select invitation_status from platform_business_circle_merchants where id=$1',
      [invited.id],
    );
    assert.equal(accepted.rows[0].invitation_status, 'accepted');
    const hidden = await request(token, `/${invited.id}/display`, 'PUT', {
      version: afterPlatform.version,
      displayConfig: { visible: false, sortOrder: 7, headline: 'Hidden' },
    });
    assert.equal(hidden.status, 200);
    const afterDisplay = (await hidden.json()).data;
    const dashboard = await fetch(`${base}/api/v1/circle/dashboard`, {
      headers: { authorization: `Bearer ${token}`, 'x-request-id': randomUUID() },
    });
    assert.equal(dashboard.status, 200);
    assert.equal(
      (await dashboard.json()).data.circles
        .find((circle) => circle.id === circleId)
        .merchants.some((item) => item.merchantTenantId === merchant.id),
      false,
    );
    const exited = await request(token, `/${invited.id}/exit`, 'POST', {
      version: afterDisplay.version,
      reason: 'Merchant requested exit',
    });
    assert.equal(exited.status, 201);
    const evidence = await client.query(
      "select (select count(*) from audit_logs where resource_id=$1 and action in ('circle.merchant_invited','circle.merchant_circle_approved','circle.merchant_platform_approved','circle.merchant_display_updated','circle.merchant_exited'))::int audits,(select count(*) from outbox_events where aggregate_id=$1)::int outbox",
      [invited.id],
    );
    assert.deepEqual(evidence.rows[0], { audits: 5, outbox: 5 });
  } finally {
    await client.end();
  }
});
