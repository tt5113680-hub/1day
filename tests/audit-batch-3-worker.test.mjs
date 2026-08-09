/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const base = 'http://127.0.0.1:3164';
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function health() {
  const response = await fetch(`${base}/health`);
  return response.json();
}

async function waitFor(predicate) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const value = await predicate();
      if (value) return value;
    } catch {
      // Worker is starting or the transaction has not committed yet.
    }
    await wait(100);
  }
  throw Error('worker did not finish the expected dispatch');
}

test('worker atomically dispatches tenant-scoped outbox, reminders and overdue tasks with retry evidence', async () => {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  const ids = Object.fromEntries(
    [
      'tenant',
      'user',
      'membership',
      'organization',
      'employee',
      'customer',
      'task',
      'reminder',
      'event',
      'failedEvent',
    ].map((key) => [key, randomUUID()]),
  );
  const stamp = Date.now();
  let worker;
  try {
    await client.query(
      "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [ids.tenant, `worker-audit-${stamp}`, `Worker Audit ${stamp}`],
    );
    await client.query(
      "insert into users(id,email,display_name,status,created_by,updated_by) values($1,$2,'Worker Audit User','active',null,null)",
      [ids.user, `worker-audit-${stamp}@example.test`],
    );
    await client.query(
      "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [ids.membership, ids.tenant, ids.user],
    );
    await client.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,'worker-audit','Worker Audit','company','active',null,null)",
      [ids.organization, ids.tenant],
    );
    await client.query(
      "insert into employees(id,tenant_id,membership_id,organization_id,employee_code,title,status,created_by,updated_by) values($1,$2,$3,$4,'WORKER-AUDIT','Advisor','active',null,null)",
      [ids.employee, ids.tenant, ids.membership, ids.organization],
    );
    await client.query(
      "insert into customers(id,tenant_id,display_name,status,created_by,updated_by) values($1,$2,'Worker Audit Customer','active',null,null)",
      [ids.customer, ids.tenant],
    );
    await client.query(
      "insert into tasks(id,tenant_id,customer_id,assignee_employee_id,title,due_at,status,created_by,updated_by) values($1,$2,$3,$4,'Worker overdue task',now()-interval '1 minute','open',null,null)",
      [ids.task, ids.tenant, ids.customer, ids.employee],
    );
    await client.query(
      "insert into task_reminders(id,tenant_id,task_id,remind_at,status,created_by,updated_by) values($1,$2,$3,now()-interval '1 minute','pending',null,null)",
      [ids.reminder, ids.tenant, ids.task],
    );
    await client.query(
      "insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,'worker.audit.seed.v1','worker_audit',$3,$4,$5,'audit-batch-3',null,null)",
      [ids.event, ids.tenant, ids.task, { source: 'worker-test' }, randomUUID()],
    );

    worker = spawn(process.execPath, ['apps/worker/dist/index.js'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        HEALTH_PORT: '3164',
        WORKER_POLL_INTERVAL_MS: '1000',
        WORKER_TENANT_ID: ids.tenant,
      },
      stdio: 'ignore',
    });
    const status = await waitFor(async () => {
      const value = await health();
      return value.lastRun?.reminders === 1 && value.lastRun?.overdue === 1 ? value : null;
    });
    assert.equal(status.status, 'ok');
    assert.ok(status.lastRun.published >= 3);
    const processed = await client.query(
      `select (select status from tasks where id=$1) task_status,
              (select status from task_reminders where id=$2) reminder_status,
              (select count(*)::int from notification_logs where tenant_id=$3 and task_id=$1) notifications,
              (select status from outbox_events where id=$4) seed_event_status,
              (select count(*)::int from event_consumptions where tenant_id=$3 and event_id=$4 and consumer_name='oneday-worker.internal') consumptions,
              (select count(*)::int from audit_logs where tenant_id=$3 and action in ('task.reminder_sent','task.overdue_escalated')) audits`,
      [ids.task, ids.reminder, ids.tenant, ids.event],
    );
    assert.deepEqual(processed.rows[0], {
      task_status: 'overdue',
      reminder_status: 'sent',
      notifications: 2,
      seed_event_status: 'published',
      consumptions: 1,
      audits: 2,
    });

    const { OutboxDispatcher } = await import('../packages/events/dist/index.js');
    await client.query(
      "insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,'worker.audit.fail.v1','worker_audit',$3,$4,$5,'audit-batch-3',null,null)",
      [ids.failedEvent, ids.tenant, ids.task, {}, randomUUID()],
    );
    const failing = new OutboxDispatcher(
      databaseUrl,
      'worker-audit-failure',
      async () => {
        throw Error('expected dispatch failure');
      },
      ids.tenant,
    );
    assert.deepEqual(await failing.dispatch(), {
      published: 0,
      retried: 1,
      skipped: 0,
      deadLetter: 0,
    });
    await failing.close();
    const failed = await client.query(
      'select status,attempts,last_error from outbox_events where id=$1 and tenant_id=$2',
      [ids.failedEvent, ids.tenant],
    );
    assert.equal(failed.rows[0].status, 'pending');
    assert.equal(failed.rows[0].attempts, 1);
    assert.match(failed.rows[0].last_error, /expected dispatch failure/);
    await client.query('update outbox_events set available_at=now() where id=$1', [
      ids.failedEvent,
    ]);
    const recovered = new OutboxDispatcher(
      databaseUrl,
      'worker-audit-failure',
      async () => undefined,
      ids.tenant,
    );
    assert.deepEqual(await recovered.dispatch(), {
      published: 1,
      retried: 0,
      skipped: 0,
      deadLetter: 0,
    });
    await recovered.close();
  } finally {
    worker?.kill();
    await client.end();
  }
});
