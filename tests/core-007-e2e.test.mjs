/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const requireFromApi = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { Client } = requireFromApi('pg');
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const tenant = '00000000-0000-4000-8000-000000000001';
const base = 'http://127.0.0.1:3024';
const image =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl4qQAAAABJRU5ErkJggg==';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3024', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'core-007-e2e' },
  stdio: 'ignore',
});
const headers = (token, key) => ({
  authorization: `Bearer ${token}`,
  'content-type': 'application/json',
  'x-request-id': randomUUID(),
  ...(key ? { 'idempotency-key': key } : {}),
});
const request = (path, options) => fetch(base + path, options);

async function ready() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      if ((await request('/api/v1/health')).ok) return;
    } catch {
      // API is starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw Error('API did not become ready');
}

test.after(() => api.kill());

test('customer order results persist secure evidence, verification and connector receipts', async () => {
  await ready();
  const login = await request('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@system.local',
      password: 'ChangeMe123!',
      tenantId: tenant,
    }),
  });
  const token = (await login.json()).accessToken;
  const stamp = Date.now();
  const customerResponse = await request('/api/v1/customers', {
    method: 'POST',
    headers: headers(token, `customer-${stamp}`),
    body: JSON.stringify({
      displayName: `Result customer ${stamp}`,
      identities: [{ type: 'phone', value: `138${String(stamp).slice(-8)}` }],
    }),
  });
  assert.equal(customerResponse.status, 201);
  const customer = (await customerResponse.json()).data;
  const orderKey = `order-${stamp}`;
  const createOrder = await request(`/api/v1/customers/${customer.id}/orders`, {
    method: 'POST',
    headers: headers(token, orderKey),
    body: JSON.stringify({ orderNumber: `ORDER-${stamp}`, occurredAt: '2026-08-06T00:00:00.000Z' }),
  });
  assert.equal(createOrder.status, 201);
  const order = (await createOrder.json()).data;
  const replay = await request(`/api/v1/customers/${customer.id}/orders`, {
    method: 'POST',
    headers: headers(token, orderKey),
    body: JSON.stringify({ orderNumber: `ORDER-${stamp}`, occurredAt: '2026-08-06T00:00:00.000Z' }),
  });
  assert.equal((await replay.json()).data.id, order.id);
  const evidence = await request(`/api/v1/orders/${order.id}/evidence-files`, {
    method: 'POST',
    headers: headers(token, `evidence-${stamp}`),
    body: JSON.stringify({
      evidenceType: 'screenshot',
      originalFilename: 'proof.png',
      mediaType: 'image/png',
      contentBase64: image,
    }),
  });
  assert.equal(evidence.status, 201);
  const evidenceFile = (await evidence.json()).data;
  const download = await request(`/api/v1/evidence-files/${evidenceFile.id}/content`, {
    headers: headers(token),
  });
  assert.equal(download.status, 200);
  assert.equal(download.headers.get('x-content-type-options'), 'nosniff');
  assert.deepEqual(
    [...new Uint8Array(await download.arrayBuffer()).slice(0, 8)],
    [137, 80, 78, 71, 13, 10, 26, 10],
  );
  const unsafeFile = await request(`/api/v1/orders/${order.id}/evidence-files`, {
    method: 'POST',
    headers: headers(token, `unsafe-${stamp}`),
    body: JSON.stringify({
      evidenceType: 'photo',
      originalFilename: '../unsafe.png',
      mediaType: 'image/png',
      contentBase64: image,
    }),
  });
  assert.equal(unsafeFile.status, 400);
  const issued = await request(`/api/v1/orders/${order.id}/verification-codes`, {
    method: 'POST',
    headers: headers(token, `code-${stamp}`),
    body: JSON.stringify({ code: `CODE-${stamp}`, expiresAt: '2030-01-01T00:00:00.000Z' }),
  });
  assert.equal(issued.status, 201);
  const verification = (await issued.json()).data;
  assert.match(verification.maskedCode, /\*/);
  const redeemed = await request(
    `/api/v1/orders/${order.id}/verification-codes/${verification.id}/redeem`,
    {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ code: `CODE-${stamp}`, version: verification.version }),
    },
  );
  assert.equal(redeemed.status, 201);
  const connector = await request(`/api/v1/orders/${order.id}/connector-results`, {
    method: 'POST',
    headers: headers(token, `connector-${stamp}`),
    body: JSON.stringify({
      connectorCode: 'manual-import',
      externalReference: `external-${stamp}`,
      resultStatus: 'succeeded',
      payload: { receipt: 'captured' },
    }),
  });
  assert.equal(connector.status, 201);
  const results = await request(`/api/v1/customers/${customer.id}/results`, {
    headers: headers(token),
  });
  const resultData = (await results.json()).data;
  assert.equal(resultData.orders[0].evidenceFiles.length, 1);
  assert.equal(resultData.orders[0].verificationCodes[0].status, 'redeemed');
  assert.equal(resultData.orders[0].connectorResults[0].resultStatus, 'succeeded');
  const client = new Client({ connectionString: db });
  await client.connect();
  const unprivilegedId = randomUUID();
  const unprivilegedEmail = `evidence-no-role-${stamp}@example.test`;
  try {
    const security = await client.query(
      "select 1 from audit_logs where tenant_id=$1 and resource_id=$2 and action='result.verification_code_redeemed'",
      [tenant, verification.id],
    );
    const event = await client.query(
      "select 1 from outbox_events where tenant_id=$1 and aggregate_id=$2 and event_type='customer.order.connector_result_received.v1'",
      [tenant, order.id],
    );
    assert.equal(security.rowCount, 1);
    assert.equal(event.rowCount, 1);
    await client.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',$1,$1 from users where email='admin@system.local'",
      [unprivilegedId, unprivilegedEmail, 'No role evidence user'],
    );
    await client.query(
      "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',$3,$3)",
      [randomUUID(), tenant, unprivilegedId],
    );
  } finally {
    await client.end();
  }
  assert.equal(
    (
      await request(`/api/v1/customers/${customer.id}/results`, {
        headers: { 'x-request-id': randomUUID() },
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await request(`/api/v1/customers/${customer.id}/results`, {
        headers: { ...headers(token), 'x-tenant-context': '00000000-0000-4000-8000-000000000099' },
      })
    ).status,
    403,
  );
  const noRoleLogin = await request('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: unprivilegedEmail,
      password: 'ChangeMe123!',
      tenantId: tenant,
    }),
  });
  const noRoleToken = (await noRoleLogin.json()).accessToken;
  assert.equal(
    (await request(`/api/v1/customers/${customer.id}/results`, { headers: headers(noRoleToken) }))
      .status,
    403,
  );
});
