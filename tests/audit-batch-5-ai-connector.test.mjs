/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const tenantId = '00000000-0000-4000-8000-000000000001';
const base = 'http://127.0.0.1:3169';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3169',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'audit-batch-5',
  },
  stdio: 'ignore',
});
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function ready() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      if ((await fetch(base + '/api/v1/health')).ok) return;
    } catch {
      // API is starting.
    }
    await wait(100);
  }
  throw new Error('API did not start');
}

async function login() {
  const response = await fetch(base + '/api/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@system.local',
      password: 'ChangeMe123!',
      tenantId,
    }),
  });
  assert.equal(response.status, 201);
  return (await response.json()).accessToken;
}

test.after(() => api.kill());

test('AUDIT-BATCH-5 executes only explicit AI task commands and exposes connector delivery limits', async () => {
  await ready();
  const token = await login();
  const headers = () => ({
    authorization: 'Bearer ' + token,
    'content-type': 'application/json',
    'x-request-id': randomUUID(),
  });
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const source = (
      await client.query(
        "select id,customer_id,assignee_employee_id from tasks where tenant_id=$1 and status='open' and deleted_at is null limit 1",
        [tenantId],
      )
    ).rows[0];
    assert.ok(source);
    const executableId = randomUUID();
    await client.query(
      "insert into ai_suggestions(id,tenant_id,title,reason,impact,action_type,action_payload,model_name,model_version) values($1,$2,$3,$4,$5,'create_follow_up',$6,$7,$8)",
      [
        executableId,
        tenantId,
        'AI approved follow-up',
        'A customer needs a timed follow-up.',
        'Protect the next employee action.',
        { taskId: source.id, dueAt: '2099-01-02T10:00:00.000Z' },
        'audit-model',
        'v1',
      ],
    );
    const accepted = await fetch(
      base + '/api/v1/management/ai-suggestions/' + executableId + '/accept',
      {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ version: 1 }),
      },
    );
    const acceptedPayload = await accepted.json();
    assert.equal(accepted.status, 201, JSON.stringify(acceptedPayload));
    const acceptedData = acceptedPayload.data;
    assert.equal(acceptedData.execution_status, 'executed');
    assert.equal(acceptedData.execution_result.command, 'create_follow_up');
    const createdTaskId = acceptedData.execution_result.task.id;
    const task = (
      await client.query(
        'select customer_id,assignee_employee_id,title from tasks where id=$1 and tenant_id=$2',
        [createdTaskId, tenantId],
      )
    ).rows[0];
    assert.equal(task.customer_id, source.customer_id);
    assert.equal(task.assignee_employee_id, source.assignee_employee_id);
    assert.equal(task.title, 'AI approved follow-up');
    const taskEvidence = await client.query(
      "select (select count(*)::int from audit_logs where tenant_id=$1 and resource_id=$2 and action='task.created_from_ai_suggestion') audits,(select count(*)::int from outbox_events where tenant_id=$1 and aggregate_id=$2 and event_type='employee.task.created.v1') outbox",
      [tenantId, createdTaskId],
    );
    assert.deepEqual(taskEvidence.rows[0], { audits: 1, outbox: 1 });

    const manualId = randomUUID();
    await client.query(
      "insert into ai_suggestions(id,tenant_id,title,reason,impact,action_type,model_name,model_version) values($1,$2,'Manual review','Missing task fields','Do not fabricate an action','review_tasks','audit-model','v1')",
      [manualId, tenantId],
    );
    const manual = await fetch(base + '/api/v1/management/ai-suggestions/' + manualId + '/accept', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ version: 1 }),
    });
    assert.equal(manual.status, 201);
    assert.equal((await manual.json()).data.execution_status, 'manual_required');

    const secret = 'never-return-' + randomUUID();
    const connector = await fetch(base + '/api/v1/management/connectors/authorization-requests', {
      method: 'POST',
      headers: { ...headers(), 'idempotency-key': randomUUID() },
      body: JSON.stringify({ code: 'manual-import', secret }),
    });
    assert.equal(connector.status, 201);
    const listed = await fetch(base + '/api/v1/management/connectors', { headers: headers() });
    const item = (await listed.json()).data.find((value) => value.code === 'manual-import');
    assert.equal(item.capability.externalDelivery, 'not_available');
    assert.equal(item.capability.requiredEvidence, 'manual_external_receipt');
    assert.equal(JSON.stringify(item).includes(secret), false);

    const platform = await fetch(base + '/api/v1/platform/connectors', { headers: headers() });
    assert.equal(platform.status, 200);
    const platformConnector = (await platform.json()).data[0];
    assert.equal(platformConnector.capability.externalDelivery, 'not_available');
    assert.equal(platformConnector.capability.tenantAuthorization, 'intent_recorded_only');
  } finally {
    await client.end();
  }
});
