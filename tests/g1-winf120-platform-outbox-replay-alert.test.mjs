/* global fetch */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { URL } from 'node:url';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const base = 'http://127.0.0.1:3265';
const systemTenant = '00000000-0000-4000-8000-000000000001';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');
const page = () => read('apps/platform-web/app/p/outbox/page.tsx');
const css = () => read('apps/platform-web/app/p/outbox/page.module.css');
const service = () => read('apps/api/src/platform-outbox.service.ts');
const controller = () => read('apps/api/src/platform-outbox.controller.ts');

//
// L1 static: UI + API surface wired to 一键重放 + 告警字段, honest boundary preserved.
//
test('G1-W∞-120: /p/outbox surfaces Outbox 告警字段 + 一键重放全部 UI', () => {
  assert.match(page(), /一键重放全部/);
  assert.match(page(), /replay-all/);
  assert.match(page(), /confirmReplayAll/);
  assert.match(page(), /Outbox 告警字段/);
  assert.match(page(), /告警等级分布/);
  assert.match(page(), /alertCounts/);
  assert.match(page(), /health\?\.criticalAlerts/);
  assert.match(page(), /health\?\.activeAlerts/);
  assert.match(page(), /oldestDeadLetterMinutes/);
  assert.match(page(), /platform-outbox/);
  assert.match(page(), /非本平台下单/);
  assert.match(page(), /仅恢复本地投递状态/);
  assert.match(page(), /不会调用美团\/抖音等外部平台/);
});

test('G1-W∞-120: alert/replay-all CSS present + responsive stacking', () => {
  assert.match(css(), /\.alertPanel\s*\{/);
  assert.match(css(), /\.alertGrid\s*\{/);
  assert.match(css(), /\.alertHead\s*\{/);
  assert.match(css(), /\.confirm\s*\{/);
  assert.match(css(), /\.headActions\s*\{/);
  assert.match(css(), /@media\s*\(max-width:\s*900px\)/);
});

test('G1-W∞-120: API exposes health + replay-all + alert fields; honest boundary in service', () => {
  assert.match(controller(), /platform\/outbox/);
  assert.match(controller(), /health/);
  assert.match(controller(), /replay-all/);
  assert.match(controller(), /:tenantId\/:eventId\/replay/);
  assert.match(service(), /outbox_dlq_alerts/);
  assert.match(service(), /alert_level/);
  assert.match(service(), /replayAll/);
  assert.match(service(), /replayOne/);
  assert.match(service(), /不调用美团\/抖音等外部平台/);
  assert.match(service(), /非本平台下单/);
  assert.match(service(), /无 GMV/);
  assert.doesNotMatch(service(), /Math\.random|mockMetrics/);
});

test('G1-W∞-120: base outbox deep-density assertions stay intact (W56 parity)', () => {
  assert.match(page(), /aria-label="平台投递分布"/);
  assert.match(page(), /事件类型分布/);
  assert.match(page(), /聚合对象分布/);
  assert.match(page(), /重试次数分布/);
  assert.match(page(), /租户分布/);
  assert.doesNotMatch(page(), /AdminPageHeader/);
  assert.doesNotMatch(page(), /<Card\b/);
});

//
// L2 real DB: seed DLQ, health materializes alert ledger, replay-all resets + clears, audit/outbox.
//
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3265',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'g1-winf120-platform-outbox',
  },
  stdio: 'ignore',
});

async function ready() {
  for (let i = 0; i < 60; i += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      // starting
    }
    await wait(100);
  }
  throw new Error('API not ready');
}

async function login(email, password, tenantId) {
  const response = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, tenantId }),
  });
  assert.equal(response.status, 201);
  return (await response.json()).accessToken;
}

test.after(() => api.kill());

test('G1-W∞-120: Outbox health materializes alert ledger; replay-all one-click resets + clears; audit/outbox', async () => {
  await ready();
  const token = await login('admin@system.local', 'ChangeMe123!', systemTenant);

  const healthBefore = await fetch(`${base}/api/v1/platform/outbox/health`, {
    headers: { authorization: `Bearer ${token}`, 'x-request-id': randomUUID() },
  });
  assert.equal(healthBefore.status, 200);
  const baselineNeedsAttention = (await healthBefore.json()).data.needsAttention;

  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const tenantId = randomUUID();
  const events = Array.from({ length: 3 }, () => randomUUID());
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(
      "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [tenantId, `w120-dlq-${stamp}`, `W120 DLQ ${stamp}`],
    );
    for (const [index, id] of Array.from(events.entries())) {
      const seq = index + 1;
      const attemptCount = index === 0 ? 8 : 3;
      await client.query(
        `insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,status,attempts,last_error,created_by,updated_by,created_at,updated_at)
         values($1,$2,'w120.dlq.demo.v'||cast($5 as text),'w120_dlq',$3,'{}',$4,'w120-dlq','needs_attention',$6,'forced for W120 UI',$7,$7,now() - ($8*interval '10 minutes'),now() - ($8*interval '10 minutes'))`,
        [
          id,
          tenantId,
          randomUUID(),
          randomUUID(),
          seq,
          attemptCount,
          null,
          seq,
        ],
      );
    }
  } finally {
    await client.end();
  }

  // health materializes alerts + derived critical (attempts>=8) + oldestDeadLetterMinutes
  const health = await fetch(`${base}/api/v1/platform/outbox/health`, {
    headers: { authorization: `Bearer ${token}`, 'x-request-id': randomUUID() },
  });
  assert.equal(health.status, 200);
  const hBody = (await health.json()).data;
  assert.equal(hBody.needsAttention, baselineNeedsAttention + 3);
  assert.ok(hBody.dlqDepth >= 3);
  assert.ok(typeof hBody.oldestDeadLetterMinutes === 'number');
  assert.ok(hBody.criticalAlerts >= 1);
  assert.ok(hBody.byAlertLevel.some((b) => b.alertLevel === 'critical'));
  assert.ok(hBody.byEventType.some((b) => b.eventType.startsWith('w120.dlq.demo')));

  // dead-letters now carry alert fields
  const list = await fetch(`${base}/api/v1/platform/outbox/dead-letters?limit=100`, {
    headers: { authorization: `Bearer ${token}`, 'x-request-id': randomUUID() },
  });
  assert.equal(list.status, 200);
  const letters = (await list.json()).data;
  const ours = letters.filter((x) => events.includes(x.id));
  assert.equal(ours.length, 3);
  const crit = ours.find((x) => x.id === events[0]);
  assert.equal(crit.alertLevel, 'critical');
  assert.ok(crit.ageMinutes >= 10);
  assert.ok(typeof crit.firstSeenAt === 'string');

  // replay-all resets all to pending, clears alert ledger, writes audit + outbox
  const replay = await fetch(`${base}/api/v1/platform/outbox/replay-all`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'x-request-id': randomUUID() },
  });
  assert.equal(replay.status, 201);
  const replayBody = (await replay.json()).data;
  assert.ok(replayBody.replayedCount >= 3);

  const after = new Client({ connectionString: databaseUrl });
  await after.connect();
  try {
    const pending = (
      await after.query(
        'select count(*)::int c from outbox_events where id = any($1::uuid[]) and status=$2',
        [events, 'pending'],
      )
    ).rows[0].c;
    assert.equal(pending, 3);
    const cleared = (
      await after.query(
        'select count(*)::int c from outbox_dlq_alerts where outbox_event_id = any($1::uuid[]) and status=$2',
        [events, 'cleared'],
      )
    ).rows[0].c;
    assert.equal(cleared, 3);
    const audit = (
      await after.query(
        "select count(*)::int c from audit_logs where action='platform.outbox.replay_all' and (details->'eventIds') ?| $1::text[]",
        [events],
      )
    ).rows[0].c;
    assert.ok(audit >= 1);
    const evt = (
      await after.query(
        "select count(*)::int c from outbox_events where event_type='platform.outbox.replay_all.v1' and payload->'eventIds' ?| $1::text[]",
        [events],
      )
    ).rows[0].c;
    assert.ok(evt >= 1);
  } finally {
    await after.end();
  }

  const health2 = await fetch(`${base}/api/v1/platform/outbox/health`, {
    headers: { authorization: `Bearer ${token}`, 'x-request-id': randomUUID() },
  });
  assert.equal(health2.status, 200);
  const h2 = (await health2.json()).data;
  assert.equal(h2.needsAttention, 0);
  assert.equal(h2.alertLevel, 'healthy');
});
