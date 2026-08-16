/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { URL } from 'node:url';
import test from 'node:test';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');
const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const tenant = '00000000-0000-4000-8000-000000000001';
const base = 'http://127.0.0.1:3085';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3085',
    DATABASE_URL: db,
    AUTH_TOKEN_SECRET: 'g1-winf142-employee-queue-disposition',
  },
  stdio: 'ignore',
});
const headers = (token, extra = {}) => ({
  authorization: `Bearer ${token}`,
  'content-type': 'application/json',
  'x-request-id': randomUUID(),
  ...extra,
});
async function ready() {
  for (let i = 0; i < 40; i += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      /* starting */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw Error('API did not start');
}
async function login(email) {
  const response = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'ChangeMe123!', tenantId: tenant }),
  });
  assert.equal(response.status, 201);
  return (await response.json()).accessToken;
}

test.after(() => api.kill());

test('G1-W∞-142: migration + API expose employee queue disposition (task.manage, employee-scoped)', () => {
  const migration = read('packages/database/src/migrations/079_employee_queue_dispositions.ts');
  assert.match(migration, /createTable\('employee_queue_dispositions'\)/);
  assert.match(migration, /employee_id/);
  assert.match(migration, /queue_type/);
  assert.match(migration, /source_id/);
  assert.match(migration, /tenant_id.*references\('tenants\.id'\)/);
  assert.match(migration, /employee_id.*references\('employees\.id'\)/);
  const controller = read('apps/api/src/employee-workbench.controller.ts');
  assert.match(controller, /@Post\('dispositions'\)/);
  assert.match(controller, /authorization\.require\(authorization, 'task\.manage', tenant\)/);
  assert.match(controller, /idempotency-key/);
  const service = read('apps/api/src/employee-workbench.service.ts');
  assert.match(service, /async dispose\(/);
  assert.match(service, /employee_queue_dispositions/);
  assert.match(service, /idempotency_keys/i);
  assert.match(service, /audit_logs/i);
  assert.match(service, /outbox_events/i);
});

test('G1-W∞-142: overview surfaces disposition status + handled rate (real data, no GMV)', () => {
  const service = read('apps/api/src/employee-workbench.service.ts');
  assert.match(service, /dispositionRows/);
  assert.match(service, /queue_type, source_id, status[\s\S]*employee_queue_dispositions/);
  assert.match(service, /dispositionSummary/);
  assert.match(service, /handledRate/);
  assert.match(service, /reduceDisposition/);
});

test('G1-W∞-142: /e/workbench + /e/tasks add one-click dispose UI + rate strip', () => {
  const workbench = read('apps/employee-web/app/e/workbench/workbench.tsx');
  assert.match(workbench, /员工队列处置/);
  assert.match(workbench, /处置率/);
  assert.match(workbench, /disposition\.handled/);
  assert.match(workbench, /disposition\.pending/);
  assert.match(workbench, /\/dispositions/);
  assert.match(workbench, /queueHandled/);
  assert.match(workbench, /queueIgnored/);
  const layout = read('apps/employee-web/app/e/workbench/workbench-layout-modules.tsx');
  assert.match(layout, /员工队列处置/);
  const inbox = read('apps/employee-web/app/e/tasks/task-inbox.tsx');
  assert.match(inbox, /队列处置率/);
  assert.match(inbox, /\/dispositions/);
  assert.match(inbox, /queueHandled/);
});

test('G1-W∞-142: honest boundaries retained (tool-side trace only, non-native order fulfillment)', () => {
  const workbench = read('apps/employee-web/app/e/workbench/workbench.tsx');
  assert.match(workbench, /source=local/);
  assert.match(workbench, /非本平台下单/);
  assert.match(workbench, /不含支付金额/);
  assert.match(workbench, /不代履约美团\/抖音订单/);
  assert.doesNotMatch(workbench, /已成交/);
  assert.doesNotMatch(workbench, /本平台收款/);
  const service = read('apps/api/src/employee-workbench.service.ts');
  assert.doesNotMatch(service, /Math\.random/);
});

test('G1-W∞-142: disposition aggregates round-trip with real DB (employee-scoped, idempotent, audit/outbox)', async () => {
  await ready();
  const client = new Client({ connectionString: db });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const organization = randomUUID();
  const worker = { user: randomUUID(), membership: randomUUID(), employee: randomUUID() };
  const taskId = randomUUID();
  try {
    await client.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,$4,'team','active',null,null)",
      [organization, tenant, `o142-${stamp}`, `O142 ${stamp}`],
    );
    await client.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
      [worker.user, `E142-${stamp}@example.test`, `E142 ${stamp}`],
    );
    await client.query(
      "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [worker.membership, tenant, worker.user],
    );
    await client.query(
      'insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,$4)',
      [randomUUID(), tenant, worker.membership, '00000000-0000-4000-8000-000000000004'],
    );
    await client.query(
      "insert into employees(id,tenant_id,membership_id,organization_id,employee_code,title,status,created_by,updated_by) values($1,$2,$3,$4,$5,'Advisor','active',null,null)",
      [worker.employee, tenant, worker.membership, organization, `E142E-${stamp}`],
    );
    // an open task assigned to the worker (today)
    await client.query(
      `insert into tasks(id,tenant_id,assignee_employee_id,title,due_at,status,version,created_by,updated_by)
       values($1,$2,$3,'跟进团购消费者回访',now(),'open',1,$4,$4)`,
      [taskId, tenant, worker.employee, worker.user],
    );

    const token = await login(`E142-${stamp}@example.test`);

    // overview exposes disposition summary
    const overviewResponse = await fetch(`${base}/api/v1/employee/workbench`, {
      method: 'GET',
      headers: headers(token),
    });
    assert.equal(overviewResponse.status, 200, await overviewResponse.clone().text());
    const overview = (await overviewResponse.json()).data;
    assert.ok(overview.disposition, 'disposition summary present');
    assert.equal(typeof overview.disposition.total, 'number');
    assert.ok(overview.disposition.total >= 1, 'at least the seeded task is actionable');
    // the task row carries disposition
    const task = overview.tasks.find((item) => item.id === taskId);
    assert.ok(task, 'task present in overview');
    assert.equal(task.disposition, 'pending');

    // disposition write (handled), idempotent
    const idemKey = `edge-${stamp}`;
    const body = {
      queueType: 'open_task',
      sourceId: taskId,
      action: 'handled',
      title: '跟进团购消费者回访',
      deepLink: `/e/tasks/${taskId}`,
    };
    const first = await fetch(`${base}/api/v1/employee/workbench/dispositions`, {
      method: 'POST',
      headers: headers(token, { 'idempotency-key': idemKey }),
      body: JSON.stringify(body),
    });
    assert.equal(first.status, 201, await first.clone().text());
    const firstData = (await first.json()).data;
    assert.equal(firstData.status, 'handled');
    assert.equal(firstData.sourceId, taskId);
    assert.ok(firstData.version >= 1);

    const replay = await fetch(`${base}/api/v1/employee/workbench/dispositions`, {
      method: 'POST',
      headers: headers(token, { 'idempotency-key': idemKey }),
      body: JSON.stringify(body),
    });
    assert.equal(replay.status, 201, await replay.clone().text());
    assert.deepEqual((await replay.json()).data, firstData, 'idempotent replay returns original');

    // overview reflects handled for the specific task (baseline-relative)
    const again = await fetch(`${base}/api/v1/employee/workbench`, {
      method: 'GET',
      headers: headers(token),
    });
    const overview2 = (await again.json()).data;
    assert.ok(overview2.disposition.handled >= 1, 'at least one handled disposition');
    assert.ok(overview2.disposition.pending >= 0, 'pending count is a number');
    const task2 = overview2.tasks.find((item) => item.id === taskId);
    assert.equal(task2.disposition, 'handled');

    // audit + outbox written
    const audit = await client.query(
      "select count(*)::int c from audit_logs where tenant_id=$1 and action='employee.queue_disposition' and resource_id=$2",
      [tenant, taskId],
    );
    assert.ok(audit.rows[0].c >= 1, 'audit written');
    const outbox = await client.query(
      "select count(*)::int c from outbox_events where tenant_id=$1 and event_type='employee.queue_disposition.v1' and aggregate_id=$2",
      [tenant, taskId],
    );
    assert.ok(outbox.rows[0].c >= 1, 'outbox written');

    // fail-closed: invalid queue type -> 400
    const invalid = await fetch(`${base}/api/v1/employee/workbench/dispositions`, {
      method: 'POST',
      headers: headers(token, { 'idempotency-key': `${stamp}-bad` }),
      body: JSON.stringify({
        queueType: 'nonsense',
        sourceId: taskId,
        action: 'handled',
      }),
    });
    assert.equal(invalid.status, 400, 'invalid queue type rejected');
  } finally {
    await client
      .query('delete from employee_queue_dispositions where tenant_id=$1 and employee_id=$2', [
        tenant,
        worker.employee,
      ])
      .catch(() => undefined);
    await client.query('delete from tasks where id=$1', [taskId]).catch(() => undefined);
    await client
      .query('delete from auth_sessions where user_id=$1', [worker.user])
      .catch(() => undefined);
    await client
      .query('delete from employees where id=$1', [worker.employee])
      .catch(() => undefined);
    await client
      .query('delete from membership_roles where membership_id=$1', [worker.membership])
      .catch(() => undefined);
    await client
      .query('delete from memberships where id=$1', [worker.membership])
      .catch(() => undefined);
    await client.query('delete from users where id=$1', [worker.user]).catch(() => undefined);
    await client
      .query('delete from organizations where id=$1', [organization])
      .catch(() => undefined);
    await client.end();
  }
});
