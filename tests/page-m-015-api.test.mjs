/* global fetch, setTimeout, URL */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';

const requireFromApi = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { Client } = requireFromApi('pg');
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const tenant = '00000000-0000-4000-8000-000000000001';
const base = 'http://127.0.0.1:3115';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3115', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'page-m-015-api' },
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
      tenantId: tenant,
    }),
  });
  assert.equal(response.status, 201);
  return (await response.json()).accessToken;
}

test.after(() => api.kill());
test('connector authorization is tenant-scoped, idempotent, and never stores a raw secret', async () => {
  await ready();
  const token = await login();
  const requestId = randomUUID();
  const headers = {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
    'x-request-id': requestId,
  };
  assert.equal(
    (
      await fetch(`${base}/api/v1/management/connectors`, {
        headers: { 'x-request-id': randomUUID() },
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await fetch(`${base}/api/v1/management/connectors`, {
        headers: { ...headers, 'x-tenant-context': randomUUID() },
      })
    ).status,
    403,
  );

  const secret = `opaque-secret-${randomUUID()}`;
  const idempotencyKey = randomUUID();
  const create = () =>
    fetch(`${base}/api/v1/management/connectors/authorization-requests`, {
      method: 'POST',
      headers: { ...headers, 'idempotency-key': idempotencyKey },
      body: JSON.stringify({ code: 'manual-import', secret }),
    });
  const first = await create();
  assert.equal(first.status, 201);
  const config = (await first.json()).data;
  assert.equal(config.code, 'manual-import');
  assert.equal(config.status, 'pending_authorization');
  assert.ok(config.secret_fingerprint);
  assert.ok(!JSON.stringify(config).includes(secret));

  const repeated = await create();
  assert.equal(repeated.status, 201);
  assert.equal((await repeated.json()).data.id, config.id);

  const listed = await fetch(`${base}/api/v1/management/connectors`, { headers });
  assert.equal(listed.status, 200);
  const persisted = (await listed.json()).data.find((item) => item.id === config.id);
  assert.equal(persisted.status, 'pending_authorization');
  assert.ok(persisted.logs.some((log) => log.status === 'pending_authorization'));
  assert.ok(!JSON.stringify(persisted).includes(secret));

  const client = new Client({ connectionString: db });
  await client.connect();
  try {
    const audit = await client.query(
      "select details from audit_logs where tenant_id=$1 and resource_id=$2 and action='connector.authorization_requested' order by created_at desc limit 1",
      [tenant, config.id],
    );
    const event = await client.query(
      "select payload from outbox_events where tenant_id=$1 and aggregate_id=$2 and event_type='connector.authorization.requested.v1' order by created_at desc limit 1",
      [tenant, config.id],
    );
    assert.equal(audit.rowCount, 1);
    assert.equal(event.rowCount, 1);
    assert.ok(!JSON.stringify(audit.rows[0]).includes(secret));
    assert.ok(!JSON.stringify(event.rows[0]).includes(secret));
  } finally {
    await client.end();
  }
});
