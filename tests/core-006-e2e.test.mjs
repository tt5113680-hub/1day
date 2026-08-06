/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';
const requireFromApi = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { Client } = requireFromApi('pg');
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test',
  tenant = '00000000-0000-4000-8000-000000000001',
  base = 'http://127.0.0.1:3023';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3023', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'core-006-e2e' },
  stdio: 'ignore',
});
const h = (token, key) => ({
  authorization: `Bearer ${token}`,
  'content-type': 'application/json',
  'x-request-id': randomUUID(),
  ...(key ? { 'idempotency-key': key } : {}),
});
async function fetchApi(path, options) {
  return fetch(base + path, options);
}
async function ready() {
  for (let i = 0; i < 30; i += 1) {
    try {
      if ((await fetchApi('/api/v1/health')).ok) return;
    } catch {
      // API is starting.
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error('not ready');
}
test.after(() => api.kill());
test('overdue tasks escalate and create notification logs', async () => {
  await ready();
  const login = await fetchApi('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@system.local',
      password: 'ChangeMe123!',
      tenantId: tenant,
    }),
  });
  const token = (await login.json()).accessToken,
    client = new Client({ connectionString: db });
  await client.connect();
  try {
    const employee = (
      await client.query(
        "select id from employees where tenant_id=$1 and status='active' limit 1",
        [tenant],
      )
    ).rows[0];
    assert.ok(employee);
    const key = `task-${Date.now()}`;
    const create = await fetchApi('/api/v1/tasks', {
      method: 'POST',
      headers: h(token, key),
      body: JSON.stringify({
        assigneeEmployeeId: employee.id,
        title: 'Expired follow-up',
        dueAt: '2020-01-01T00:00:00.000Z',
        remindAt: '2019-12-31T00:00:00.000Z',
      }),
    });
    assert.equal(create.status, 201);
    const task = (await create.json()).data;
    assert.equal((await fetchApi('/api/v1/tasks', { headers: h(token) })).status, 200);
    const processed = await fetchApi('/api/v1/tasks/actions/process-due', {
      method: 'POST',
      headers: h(token),
      body: '{}',
    });
    const processedBody = await processed.text();
    assert.equal(processed.status, 201, processedBody);
    assert.equal(JSON.parse(processedBody).data.overdue >= 1, true);
    assert.equal(JSON.parse(processedBody).data.reminders >= 1, true);
    const logs = await client.query(
      "select 1 from notification_logs where task_id=$1 and notification_type='overdue_escalation'",
      [task.id],
    );
    const events = await client.query(
      "select 1 from outbox_events where aggregate_id=$1 and event_type='employee.task.overdue.v1'",
      [task.id],
    );
    const audit = await client.query(
      "select 1 from audit_logs where tenant_id=$1 and resource_id=$2 and action='task.overdue_escalated'",
      [tenant, task.id],
    );
    assert.equal(logs.rowCount, 1);
    assert.equal(events.rowCount, 1);
    assert.equal(audit.rowCount, 1);
    const dndTask = await fetchApi('/api/v1/tasks', {
      method: 'POST',
      headers: h(token, `${key}-dnd`),
      body: JSON.stringify({
        assigneeEmployeeId: employee.id,
        title: 'Quiet-hours reminder',
        dueAt: '2030-01-01T00:00:00.000Z',
        remindAt: '2020-01-01T00:00:00.000Z',
      }),
    });
    assert.equal(dndTask.status, 201);
    const existingPreference = await client.query(
      'select version from employee_notification_preferences where tenant_id=$1 and employee_id=$2 and deleted_at is null',
      [tenant, employee.id],
    );
    const quiet = await fetchApi('/api/v1/tasks/notification-preferences', {
      method: 'POST',
      headers: h(token),
      body: JSON.stringify({
        employeeId: employee.id,
        doNotDisturbUntil: '2030-01-01T00:00:00.000Z',
        version: existingPreference.rows[0]?.version ?? 0,
      }),
    });
    assert.equal(quiet.status, 201);
    const quietBody = await quiet.json();
    const suppressed = await fetchApi('/api/v1/tasks/actions/process-due', {
      method: 'POST',
      headers: h(token),
      body: '{}',
    });
    assert.equal((await suppressed.json()).data.reminders, 0);
    const resumed = await fetchApi('/api/v1/tasks/notification-preferences', {
      method: 'POST',
      headers: h(token),
      body: JSON.stringify({
        employeeId: employee.id,
        doNotDisturbUntil: null,
        version: quietBody.data.version,
      }),
    });
    assert.equal(resumed.status, 201);
    const delivered = await fetchApi('/api/v1/tasks/actions/process-due', {
      method: 'POST',
      headers: h(token),
      body: '{}',
    });
    assert.equal((await delivered.json()).data.reminders, 1);
    const reminderLogs = await client.query(
      "select 1 from notification_logs where task_id=$1 and notification_type='reminder'",
      [(await dndTask.json()).data.id],
    );
    assert.equal(reminderLogs.rowCount, 1);
    assert.equal(
      (await fetchApi('/api/v1/tasks', { headers: { 'x-request-id': randomUUID() } })).status,
      401,
    );
    assert.equal(
      (
        await fetchApi('/api/v1/tasks', {
          headers: { ...h(token), 'x-tenant-context': '00000000-0000-4000-8000-000000000099' },
        })
      ).status,
      403,
    );
  } finally {
    await client.end();
  }
});
