/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';
const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test',
  tenant = '00000000-0000-4000-8000-000000000001',
  base = 'http://127.0.0.1:3096';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3096', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'page-m-006-api' },
  stdio: 'ignore',
});
const headers = (token) => ({
  authorization: `Bearer ${token}`,
  'content-type': 'application/json',
  'x-request-id': randomUUID(),
});
async function ready() {
  for (let i = 0; i < 30; i += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      /* start */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error('API did not start');
}
async function login() {
  const r = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@system.local',
      password: 'ChangeMe123!',
      tenantId: tenant,
    }),
  });
  assert.equal(r.status, 201);
  return (await r.json()).accessToken;
}
test.after(() => api.kill());
test('AI suggestions preserve model metadata, acceptance, feedback, audit and tenant scope', async () => {
  await ready();
  const c = new Client({ connectionString: db });
  await c.connect();
  const id = randomUUID();
  try {
    await c.query(
      "insert into ai_suggestions(id,tenant_id,title,reason,impact,action_type,model_name,model_version) values($1,$2,'Recover overdue tasks','Two tasks are overdue','Protect customer follow-up','review_tasks','rule-engine','2026.08')",
      [id, tenant],
    );
    const token = await login();
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/ai-suggestions`, {
          headers: { 'x-request-id': randomUUID() },
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/ai-suggestions`, {
          headers: { ...headers(token), 'x-tenant-context': randomUUID() },
        })
      ).status,
      403,
    );
    const list = await fetch(`${base}/api/v1/management/ai-suggestions`, {
      headers: headers(token),
    });
    assert.equal(
      (await list.json()).data.some((x) => x.id === id && x.model_name === 'rule-engine'),
      true,
    );
    const accepted = await fetch(`${base}/api/v1/management/ai-suggestions/${id}/accept`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ version: 1 }),
    });
    assert.equal((await accepted.json()).data.status, 'accepted');
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/ai-suggestions/${id}/accept`, {
          method: 'POST',
          headers: headers(token),
          body: JSON.stringify({ version: 1 }),
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/ai-suggestions/${id}/feedback`, {
          method: 'POST',
          headers: headers(token),
          body: JSON.stringify({ version: 2, feedback: 'Scheduled review this afternoon' }),
        })
      ).status,
      201,
    );
    const audit = await c.query(
      "select count(*)::int count from audit_logs where resource_id=$1 and action='ai.suggestion_accepted'",
      [id],
    );
    const outbox = await c.query(
      "select count(*)::int count from outbox_events where aggregate_id=$1 and event_type='ai.suggestion_feedback.v1'",
      [id],
    );
    assert.equal(audit.rows[0].count, 1);
    assert.equal(outbox.rows[0].count, 1);
  } finally {
    await c.end();
  }
});
