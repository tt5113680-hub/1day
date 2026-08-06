/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const tenant = '00000000-0000-4000-8000-000000000001';
const base = 'http://127.0.0.1:3026';
const requireFromApi = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { Client } = requireFromApi('pg');
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3026', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'core-009-e2e' },
  stdio: 'ignore',
});
const h = (token, key) => ({
  authorization: `Bearer ${token}`,
  'content-type': 'application/json',
  'x-request-id': randomUUID(),
  ...(key ? { 'idempotency-key': key } : {}),
});
const request = (path, options) => fetch(base + path, options);
async function ready() {
  for (let i = 0; i < 30; i += 1) {
    try {
      if ((await request('/api/v1/health')).ok) return;
    } catch {
      // API is starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw Error('API not ready');
}
async function login(email, password) {
  const response = await request('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, tenantId: tenant }),
  });
  assert.equal(response.status, 201);
  return (await response.json()).accessToken;
}
test.after(() => api.kill());
test('external actions are validated, tenant-scoped, idempotent, and auditable', async () => {
  await ready();
  const token = await login('admin@system.local', 'ChangeMe123!');
  const stamp = Date.now();
  const payload = {
    code: `site-${stamp}`,
    name: 'Reservation site',
    actionType: 'link',
    targetUrl: 'https://example.com/reserve?source=oneday',
    platform: 'web',
  };
  const key = `external-action-${stamp}`;
  const create = await request('/api/v1/external-actions', {
    method: 'POST',
    headers: h(token, key),
    body: JSON.stringify(payload),
  });
  assert.equal(create.status, 201);
  const action = (await create.json()).data;
  assert.equal(action.target_url, payload.targetUrl);
  const duplicate = await request('/api/v1/external-actions', {
    method: 'POST',
    headers: h(token, key),
    body: JSON.stringify(payload),
  });
  assert.equal(duplicate.status, 201);
  assert.equal((await duplicate.json()).data.id, action.id);
  const mini = await request('/api/v1/external-actions', {
    method: 'POST',
    headers: h(token, `mini-${stamp}`),
    body: JSON.stringify({
      code: `mini-${stamp}`,
      name: 'WeChat booking',
      actionType: 'mini_program',
      miniProgramAppId: 'wx1234567890',
      miniProgramPath: '/pages/booking/index?source=oneday',
      platform: 'wechat',
    }),
  });
  assert.equal(mini.status, 201);
  const open = await request(`/api/v1/external-actions/${action.id}/open`, {
    method: 'POST',
    headers: h(token),
    body: JSON.stringify({ context: { source: 'landing' } }),
  });
  assert.equal(open.status, 201);
  assert.equal((await open.json()).data.action.targetUrl, payload.targetUrl);
  const actions = await request('/api/v1/external-actions', { headers: h(token) });
  assert.equal(actions.status, 200);
  assert.equal((await actions.json()).data.filter((item) => item.id === action.id).length, 1);
  assert.equal(
    (
      await request('/api/v1/external-actions', {
        headers: { ...h(token), 'x-tenant-context': '00000000-0000-4000-8000-000000000099' },
      })
    ).status,
    403,
  );
  assert.equal((await request('/api/v1/external-actions')).status, 401);
  const invalid = await request('/api/v1/external-actions', {
    method: 'POST',
    headers: h(token, `invalid-${stamp}`),
    body: JSON.stringify({
      ...payload,
      code: `invalid-${stamp}`,
      targetUrl: 'javascript:alert(1)',
    }),
  });
  assert.equal(invalid.status, 400);
  const client = new Client({ connectionString: db });
  await client.connect();
  try {
    const events = await client.query(
      "select count(*)::int as count from external_action_events where tenant_id=$1 and action_id=$2 and event_type='opened'",
      [tenant, action.id],
    );
    assert.equal(events.rows[0].count, 1);
    const audit = await client.query(
      "select count(*)::int as count from audit_logs where tenant_id=$1 and action='external_action.opened' and resource_id=$2",
      [tenant, action.id],
    );
    assert.equal(audit.rows[0].count, 1);
    const outbox = await client.query(
      "select count(*)::int as count from outbox_events where tenant_id=$1 and event_type='external_action.opened.v1' and aggregate_id=$2",
      [tenant, action.id],
    );
    assert.equal(outbox.rows[0].count, 1);
    const userId = randomUUID(),
      membershipId = randomUUID();
    await client.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',$1,$1 from users where email='admin@system.local'",
      [userId, `no-action-${stamp}@test.local`, 'No Action Permission'],
    );
    await client.query(
      "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',$3,$3)",
      [membershipId, tenant, userId],
    );
  } finally {
    await client.end();
  }
  const noPermissionToken = await login(`no-action-${stamp}@test.local`, 'ChangeMe123!');
  assert.equal(
    (await request('/api/v1/external-actions', { headers: h(noPermissionToken) })).status,
    403,
  );
});
