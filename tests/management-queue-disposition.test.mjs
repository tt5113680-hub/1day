/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const tenant = '00000000-0000-4000-8000-000000000001';
const base = 'http://127.0.0.1:3077';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3077',
    DATABASE_URL: db,
    AUTH_TOKEN_SECRET: 'management-queue-disposition',
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
test('G1-W∞-107: workbench queue one-click disposition round-trips with real DB', async () => {
  await ready();
  const client = new Client({ connectionString: db });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const organization = randomUUID();
  const owner = { user: randomUUID(), membership: randomUUID(), employee: randomUUID() };
  const peer = { user: randomUUID(), membership: randomUUID(), employee: randomUUID() };
  const customer = randomUUID();
  const task = randomUUID();
  const approval = randomUUID();
  const lead = randomUUID();
  const consult = randomUUID();
  const readerRole = randomUUID();
  const perms = {};
  const merchant = randomUUID();
  const store = randomUUID();
  const externalAction = randomUUID();
  try {
    await client.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,'Queue org','team','active',null,null)",
      [organization, tenant, `queue-${stamp}`],
    );
    await client.query(
      "insert into roles(id,tenant_id,code,name,status,created_by,updated_by) values($1,$2,$3,'Reader','active',null,null)",
      [readerRole, tenant, `reader-${stamp}`],
    );
    for (const [person, name, code] of [
      [owner, 'Queue owner', 'QOWN'],
      [peer, 'Queue reader', 'QREAD'],
    ]) {
      await client.query(
        "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
        [person.user, `${code}-${stamp}@example.test`, name],
      );
      await client.query(
        "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
        [person.membership, tenant, person.user],
      );
      const role = person === peer ? readerRole : '00000000-0000-4000-8000-000000000004';
      await client.query(
        'insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,$4)',
        [randomUUID(), tenant, person.membership, role],
      );
      await client.query(
        "insert into employees(id,tenant_id,membership_id,organization_id,employee_code,title,status,created_by,updated_by) values($1,$2,$3,$4,$5,'Advisor','active',null,null)",
        [person.employee, tenant, person.membership, organization, `${code}-${stamp}`],
      );
    }
    const permissions = await client.query(
      "select code,id from permissions where code in ('tenant.manage','customer.read') and status='active'",
    );
    for (const row of permissions.rows) perms[row.code] = row.id;
    assert.ok(perms['tenant.manage'] && perms['customer.read']);
    await client.query(
      "insert into role_permissions(id,tenant_id,role_id,permission_id,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null)",
      [randomUUID(), tenant, readerRole, perms['customer.read']],
    );
    await client.query(
      "insert into customers(id,tenant_id,display_name,status,created_by,updated_by) values($1,$2,'Queue customer','active',null,null)",
      [customer, tenant],
    );
    await client.query(
      "insert into tasks(id,tenant_id,customer_id,assignee_employee_id,title,reason,due_at,status,created_by,updated_by) values($1,$2,$3,$4,'Call queue customer','Trace proof',now()-interval '1 hour','overdue',null,null)",
      [task, tenant, customer, owner.employee],
    );
    await client.query(
      "insert into customer_ownership_transfer_approvals(id,tenant_id,customer_id,from_employee_id,to_employee_id,reason,requested_version,status,created_by,updated_by) values($1,$2,$3,null,$4,'Ownership handoff',1,'pending',null,null)",
      [approval, tenant, customer, owner.employee],
    );
    await client.query(
      "insert into merchants(id,tenant_id,organization_id,code,name,status,created_by,updated_by) values($1,$2,$3,'QM-'||$4,'Queue merchant','active',null,null)",
      [merchant, tenant, organization, stamp],
    );
    await client.query(
      "insert into stores(id,tenant_id,organization_id,merchant_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,'QS-'||$5,'Queue store','active',null,null)",
      [store, tenant, organization, merchant, stamp],
    );
    await client.query(
      "insert into external_actions(id,tenant_id,code,name,action_type,platform,status,created_by,updated_by) values($1,$2,'QE-'||$3,'Queue action','consult','scan','active',null,null)",
      [externalAction, tenant, stamp],
    );
    await client.query(
      "insert into consumer_action_events(id,tenant_id,store_id,external_action_id,source,idempotency_key,status,created_by,updated_by) values($1,$2,$3,$4,'queue-consult','qk-'||$5,'active',null,null)",
      [consult, tenant, store, externalAction, stamp],
    );
    await client.query(
      "insert into employee_lead_pool_entries(id,tenant_id,customer_id,source_type,priority,status,created_by,updated_by) values($1,$2,$3,'consult','high','open',null,null)",
      [lead, tenant, customer],
    );
    const ownerToken = await login(`${'QOWN'}-${stamp}@example.test`);
    const peerToken = await login(`${'QREAD'}-${stamp}@example.test`);
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/dashboard/dispositions`, {
          method: 'POST',
          headers: headers(ownerToken),
          body: JSON.stringify({}),
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/dashboard/dispositions`, {
          method: 'POST',
          headers: headers(ownerToken, { 'x-tenant-context': randomUUID() }),
          body: JSON.stringify({ queueType: 'overdue_task', sourceId: task, action: 'handled' }),
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/dashboard`, {
          headers: headers(ownerToken),
        })
      ).status,
      200,
    );
    const key = randomUUID();
    const post = await fetch(`${base}/api/v1/management/dashboard/dispositions`, {
      method: 'POST',
      headers: headers(ownerToken, {
        'idempotency-key': key,
        'x-request-id': randomUUID(),
      }),
      body: JSON.stringify({
        queueType: 'overdue_task',
        sourceId: task,
        action: 'handled',
        title: 'Call queue customer',
        deepLink: '/e/tasks/' + task,
      }),
    });
    assert.equal(post.status, 201);
    const created = (await post.json()).data;
    assert.equal(created.status, 'handled');
    assert.equal(created.queueType, 'overdue_task');
    assert.equal(created.sourceId, task);
    // idempotency replay returns the same response without error
    const replay = await fetch(`${base}/api/v1/management/dashboard/dispositions`, {
      method: 'POST',
      headers: headers(ownerToken, {
        'idempotency-key': key,
        'x-request-id': randomUUID(),
      }),
      body: JSON.stringify({
        queueType: 'overdue_task',
        sourceId: task,
        action: 'handled',
        title: 'Call queue customer',
        deepLink: '/e/tasks/' + task,
      }),
    });
    assert.equal(replay.status, 201);
    assert.equal((await replay.json()).data.status, 'handled');
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/dashboard/dispositions`, {
          method: 'POST',
          headers: headers(peerToken),
          body: JSON.stringify({ queueType: 'overdue_task', sourceId: task, action: 'handled' }),
        })
      ).status,
      403,
    );
    // dashboard reflects the disposition on the overdue anomaly
    const dash = await fetch(`${base}/api/v1/management/dashboard`, {
      headers: headers(ownerToken),
    });
    assert.equal(dash.status, 200);
    const payload = (await dash.json()).data;
    const myAnomaly = payload.anomalies.find((item) => item.id === task);
    assert.ok(myAnomaly, 'seeded overdue task surfaced as anomaly');
    assert.equal(myAnomaly.disposition, 'handled');
    assert.equal(typeof payload.disposition.handled, 'number');
    assert.equal(typeof payload.disposition.pending, 'number');
    assert.equal(typeof payload.disposition.handledRate, 'number');
    assert.ok(payload.disposition.total >= 1, 'actionable queue total non-empty');
    const audit = await client.query(
      "select count(*)::int as c from audit_logs where tenant_id=$1 and action='management.queue_disposition' and resource_id=$2",
      [tenant, task],
    );
    assert.ok(audit.rows[0].c >= 1, 'audit written for disposition');
    const outbox = await client.query(
      "select count(*)::int as c from outbox_events where tenant_id=$1 and event_type='management.queue_disposition.v1' and aggregate_id=$2",
      [tenant, task],
    );
    assert.ok(outbox.rows[0].c >= 1, 'outbox written for disposition');
  } finally {
    await client.end();
  }
});
