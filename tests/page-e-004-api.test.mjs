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
  base = 'http://127.0.0.1:3062';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3062', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'page-e-004-api' },
  stdio: 'ignore',
});
const headers = (token, extra = {}) => ({
  authorization: `Bearer ${token}`,
  'content-type': 'application/json',
  'x-request-id': randomUUID(),
  ...extra,
});
async function ready() {
  for (let i = 0; i < 30; i += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      // API is starting.
    }
    await new Promise((x) => setTimeout(x, 100));
  }
  throw Error('API did not start');
}
async function login(email) {
  const r = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'ChangeMe123!', tenantId: tenant }),
  });
  assert.equal(r.status, 201);
  return (await r.json()).accessToken;
}
test.after(() => api.kill());
test('employee records an idempotent follow-up and next task only for own task', async () => {
  await ready();
  const c = new Client({ connectionString: db });
  await c.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`,
    org = randomUUID(),
    user = randomUUID(),
    membership = randomUUID(),
    employee = randomUUID(),
    peerUser = randomUUID(),
    peerMembership = randomUUID(),
    peer = randomUUID(),
    customer = randomUUID(),
    own = randomUUID(),
    other = randomUUID(),
    email = `followup-${stamp}@example.test`;
  try {
    await c.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,'Follow-up org','team','active',null,null)",
      [org, tenant, `fu-${stamp}`],
    );
    for (const [u, m, e, mail, code] of [
      [user, membership, employee, email, `FU-${stamp}`],
      [peerUser, peerMembership, peer, `peer-followup-${stamp}@example.test`, `PEER-${stamp}`],
    ]) {
      await c.query(
        "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
        [u, mail, e === employee ? 'Follow-up owner' : 'Follow-up peer'],
      );
      await c.query(
        "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
        [m, tenant, u],
      );
      await c.query(
        "insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,'00000000-0000-4000-8000-000000000004')",
        [randomUUID(), tenant, m],
      );
      await c.query(
        "insert into employees(id,tenant_id,membership_id,organization_id,employee_code,title,status,created_by,updated_by) values($1,$2,$3,$4,$5,'Advisor','active',null,null)",
        [e, tenant, m, org, code],
      );
    }
    await c.query(
      "insert into customers(id,tenant_id,display_name,status,created_by,updated_by) values($1,$2,'Follow-up customer','active',null,null)",
      [customer, tenant],
    );
    await c.query(
      "insert into tasks(id,tenant_id,customer_id,assignee_employee_id,title,due_at,status,created_by,updated_by) values($1,$2,$3,$4,'Own follow-up task',now()+interval '1 hour','open',null,null),($5,$2,$3,$6,'Peer follow-up task',now()+interval '1 hour','open',null,null)",
      [own, tenant, customer, employee, other, peer],
    );
    const token = await login(email),
      key = `followup-${stamp}`,
      body = {
        actionType: 'call',
        rawNote: 'Customer confirmed the visit.',
        voiceTranscript: 'Voice note: customer asked for Friday.',
        summary: 'Visit confirmed; prepare Friday follow-up.',
        nextTaskTitle: 'Prepare Friday visit',
        nextTaskDueAt: new Date(Date.now() + 86400000).toISOString(),
      };
    const create = () =>
      fetch(`${base}/api/v1/employee/tasks/${own}/follow-ups`, {
        method: 'POST',
        headers: headers(token, { 'idempotency-key': key }),
        body: JSON.stringify(body),
      });
    const r = await create();
    assert.equal(r.status, 201);
    const data = (await r.json()).data;
    assert.equal(data.summary, body.summary);
    assert.ok(data.next_task_id);
    const replay = await create();
    assert.equal(replay.status, 201);
    assert.deepEqual((await replay.json()).data, data);
    const list = await fetch(`${base}/api/v1/employee/tasks/${own}/follow-ups`, {
      headers: headers(token),
    });
    assert.equal(list.status, 200);
    assert.equal((await list.json()).data.length, 1);
    assert.equal(
      (
        await fetch(`${base}/api/v1/employee/tasks/${other}/follow-ups`, {
          method: 'POST',
          headers: headers(token, { 'idempotency-key': randomUUID() }),
          body: JSON.stringify(body),
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/employee/tasks/${own}/follow-ups`, {
          headers: { 'x-request-id': randomUUID() },
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/employee/tasks/${own}/follow-ups`, {
          headers: headers(token, { 'x-tenant-context': randomUUID() }),
        })
      ).status,
      403,
    );
    const proof = await c.query(
      "select (select count(*) from task_follow_ups where tenant_id=$1 and task_id=$2)::int as followups,(select count(*) from audit_logs where tenant_id=$1 and resource_id=$2 and action='employee.task_follow_up_recorded')::int as audits,(select count(*) from outbox_events where tenant_id=$1 and aggregate_id=$2 and event_type='employee.task.follow_up_recorded.v1')::int as outbox,(select count(*) from tasks where id=$3 and tenant_id=$1)::int as next",
      [tenant, own, data.next_task_id],
    );
    assert.deepEqual(proof.rows[0], { followups: 1, audits: 1, outbox: 1, next: 1 });
  } finally {
    await c.end();
  }
});
