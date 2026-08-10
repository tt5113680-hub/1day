/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';
import { createSyncNotificationHandler, OutboxDispatcher } from '../packages/events/dist/index.js';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const apiBase = 'http://127.0.0.1:3342';
const systemTenant = '00000000-0000-4000-8000-000000000001';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3342',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'p1-b-content-sync',
  },
  stdio: 'ignore',
});

async function ready(url) {
  for (let i = 0; i < 50; i += 1) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // starting
    }
    await wait(100);
  }
  throw Error(`service not ready: ${url}`);
}

async function login(email, password, tenantId) {
  const response = await fetch(`${apiBase}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, tenantId }),
  });
  assert.equal(response.status, 201);
  return (await response.json()).accessToken;
}

function authHeaders(token, tenantId, extra = {}) {
  return {
    authorization: `Bearer ${token}`,
    'x-tenant-context': tenantId,
    'x-request-id': randomUUID(),
    'content-type': 'application/json',
    ...extra,
  };
}

test.after(() => api.kill());

test('P1-B content approve->place emits content.published.v1 and converges to the content sync topic', async () => {
  await ready(`${apiBase}/api/v1/health`);
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const slug = `p1b-content-${suffix}`;
  const email = `${slug}@example.test`;
  const password = `C-${suffix}-Password!`;
  try {
    const system = await login('admin@system.local', 'ChangeMe123!', systemTenant);
    const provision = await fetch(`${apiBase}/api/v1/platform/onboarding`, {
      method: 'POST',
      headers: {
        ...authHeaders(system, systemTenant),
        'idempotency-key': randomUUID(),
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        slug,
        tenantName: `P1B Content ${suffix}`,
        organizationName: 'Content HQ',
        merchantName: 'Content Merchant',
        storeName: 'Content Store',
        address: '1 Content Rd',
        phone: '021-55550112',
        businessHours: '09:00-21:00',
        adminName: 'Content Owner',
        adminEmail: email,
        adminPassword: password,
        industry: 'restaurant',
        plan: 'starter',
      }),
    });
    assert.equal(provision.status, 201);
    const run = (await provision.json()).data;
    const owner = await login(email, password, run.tenantId);
    const storeId = run.steps.find((step) => step.code === 'organization_store').output.storeId;
    const title = `今日动态 ${suffix}`;

    const created = await fetch(`${apiBase}/api/v1/management/content`, {
      method: 'POST',
      headers: authHeaders(owner, run.tenantId, { 'idempotency-key': randomUUID() }),
      body: JSON.stringify({ kind: 'article', title, body: '唯一内容真源' }),
    });
    assert.equal(created.status, 201);
    const item = (await created.json()).data;
    assert.equal(item.status, 'draft');

    const approved = await fetch(`${apiBase}/api/v1/management/content/${item.id}/approve`, {
      method: 'POST',
      headers: authHeaders(owner, run.tenantId),
      body: JSON.stringify({ version: item.version }),
    });
    assert.equal(approved.status, 201);

    const dispatch = new OutboxDispatcher(
      databaseUrl,
      `p1b-content-${suffix}`,
      createSyncNotificationHandler(databaseUrl),
      run.tenantId,
    );
    const dispatchResult = await dispatch.dispatch(100);
    await dispatch.close();
    assert.ok(dispatchResult.published >= 1);

    const publishedRow = await client.query(
      `select event_type from outbox_events
       where tenant_id=$1 and aggregate_id=$2 and event_type='content.published.v1'`,
      [run.tenantId, item.id],
    );
    assert.ok(publishedRow.rowCount >= 1);

    const contentTopic = await client.query(
      `select topic,event_type,aggregate_id from sync_notifications
       where tenant_id=$1 and aggregate_id=$2 and event_type='content.published.v1'`,
      [run.tenantId, item.id],
    );
    assert.ok(contentTopic.rowCount >= 1);
    assert.ok(
      contentTopic.rows.some((row) => String(row.topic).endsWith(':content')),
      'content.published.v1 must converge to the content sync topic',
    );

    const poll = await fetch(`${apiBase}/api/v1/sync/changes?topics=content`, {
      headers: authHeaders(owner, run.tenantId),
    });
    assert.equal(poll.status, 200);
    const changes = await poll.json();
    assert.ok(
      changes.data.changes.some(
        (change) => change.eventType === 'content.published.v1' && change.aggregateId === item.id,
      ),
      'approve event must be visible via /sync/changes content topic (SY-01 convergence)',
    );
    assert.equal(changes.data.pollAfterSeconds, 30);

    const placed = await fetch(`${apiBase}/api/v1/management/content/${item.id}/placements`, {
      method: 'POST',
      headers: authHeaders(owner, run.tenantId),
      body: JSON.stringify({ storeId, rank: 500 }),
    });
    assert.equal(placed.status, 201);

    const consumer = await fetch(`${apiBase}/api/v1/consumer/stores/${storeId}?tenant=${slug}`);
    assert.equal(
      (await consumer.json()).data.content.some((x) => x.title === title),
      true,
      'approved + placed content must be readable by the Consumer published read model',
    );
  } finally {
    await client.end();
  }
});
