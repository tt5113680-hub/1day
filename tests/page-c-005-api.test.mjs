/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { URL } from 'node:url';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const base = 'http://127.0.0.1:3042';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3042', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'page-c-005-api' },
  stdio: 'ignore',
});
const ready = async () => {
  for (let i = 0; i < 30; i += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      /* starting */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('API did not start');
};
test.after(() => api.kill());

test('consumer action confirmation is tenant-scoped, idempotent and auditable', async () => {
  await ready();
  const client = new Client({ connectionString: db });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const tenantId = randomUUID();
  const actionId = randomUUID();
  const slug = `redirect-${stamp}`;
  try {
    await client.query(
      "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,'Redirect tenant','active',null,null)",
      [tenantId, slug],
    );
    await client.query(
      "insert into external_actions(id,tenant_id,code,name,action_type,target_url,platform,status,created_by,updated_by) values($1,$2,$3,'打开服务','link','https://example.com/redirect','web','active',null,null)",
      [actionId, tenantId, `redirect-code-${stamp}`],
    );
    const detail = await fetch(`${base}/api/v1/consumer/actions/${actionId}?tenant=${slug}`);
    assert.equal(detail.status, 200);
    assert.equal((await detail.json()).data.action.copyCode, `redirect-code-${stamp}`);
    const key = `redirect-key-${stamp}`;
    const open = () =>
      fetch(`${base}/api/v1/consumer/actions/${actionId}/confirm?tenant=${slug}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': key },
        body: JSON.stringify({ source: 'consumer:entry', returnTo: `/c/entry?tenant=${slug}` }),
      });
    const first = await open();
    assert.equal(first.status, 201);
    const initial = (await first.json()).data;
    assert.equal(initial.destination, 'https://example.com/redirect');
    assert.equal(initial.replayed, false);
    const replay = await open();
    assert.equal(replay.status, 201);
    assert.equal((await replay.json()).data.replayed, true);
    const counts = await client.query(
      "select (select count(*) from consumer_action_redirect_events where tenant_id=$1 and idempotency_key=$2)::int as redirects,(select count(*) from audit_logs where tenant_id=$1 and action='consumer.action_redirect_confirmed')::int as audits,(select count(*) from outbox_events where tenant_id=$1 and event_type='consumer.action.redirect.confirmed.v1')::int as outbox",
      [tenantId, key],
    );
    assert.deepEqual(counts.rows[0], { redirects: 1, audits: 1, outbox: 1 });
    assert.equal(
      (await fetch(`${base}/api/v1/consumer/actions/${actionId}?tenant=system`)).status,
      404,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/consumer/actions/${actionId}/confirm?tenant=${slug}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'idempotency-key': `bad-${stamp}` },
          body: JSON.stringify({ returnTo: 'https://attacker.example' }),
        })
      ).status,
      400,
    );
  } finally {
    await client.end();
  }
});
