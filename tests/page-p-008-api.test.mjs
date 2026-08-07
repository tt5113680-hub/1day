/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const base = 'http://127.0.0.1:3142';
const tenantId = '00000000-0000-4000-8000-000000000001';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3142', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'page-p-008-api' },
  stdio: 'ignore',
});
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
async function ready() {
  for (let i = 0; i < 30; i += 1) {
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
  const r = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin@system.local', password: 'ChangeMe123!', tenantId }),
  });
  assert.equal(r.status, 201);
  return (await r.json()).accessToken;
}
test.after(() => api.kill());
test('platform security audit locates persisted connector risk signals and records versioned dispositions', async () => {
  await ready();
  const client = new Client({ connectionString: db });
  await client.connect();
  const id = randomUUID();
  const code = `security-${Date.now()}`;
  await client.query(
    "insert into platform_connector_definitions(id,tenant_id,code,name,auth_mode,rate_limit_per_minute,health_status,created_by,updated_by) values($1,$2,$3,'Security connector','oauth',120,'degraded',null,null)",
    [id, tenantId, code],
  );
  try {
    const token = await login();
    assert.equal(
      (
        await fetch(`${base}/api/v1/platform/security-audit`, {
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
    const listed = await fetch(`${base}/api/v1/platform/security-audit`, { headers });
    assert.equal(listed.status, 200);
    const risk = (await listed.json()).data.risks.find((row) => row.risk_key === `connector:${id}`);
    assert.equal(risk.kind, 'connector_health');
    const acknowledged = await fetch(`${base}/api/v1/platform/security-audit/acknowledgements`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        riskKey: risk.risk_key,
        note: 'Reviewed connector degradation.',
        version: 1,
      }),
    });
    assert.equal(acknowledged.status, 201);
    const disposition = (await acknowledged.json()).data;
    const replay = await fetch(`${base}/api/v1/platform/security-audit/acknowledgements`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        riskKey: risk.risk_key,
        note: 'Reviewed connector degradation.',
        version: 1,
      }),
    });
    assert.equal((await replay.json()).data.status, 'acknowledged');
    const counts = await client.query(
      "select (select count(*) from platform_security_reviews where tenant_id=$1 and risk_key=$2)::int reviews,(select count(*) from audit_logs where tenant_id=$1 and action='platform.security_risk_acknowledged' and resource_id=$3)::int audits,(select count(*) from outbox_events where tenant_id=$1 and event_type='platform.security_risk.acknowledged.v1' and aggregate_id=$3)::int outbox",
      [tenantId, risk.risk_key, disposition.id],
    );
    assert.deepEqual(counts.rows[0], { reviews: 1, audits: 1, outbox: 1 });
  } finally {
    await client.end();
  }
});
