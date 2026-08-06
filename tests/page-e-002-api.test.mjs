/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const tenant = '00000000-0000-4000-8000-000000000001';
const base = 'http://127.0.0.1:3056';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3056', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'page-e-002-api' },
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

test('employee task detail preserves self scope and safely links customer evidence', async () => {
  await ready();
  const c = new Client({ connectionString: db });
  await c.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const organization = randomUUID();
  const ownerUser = randomUUID();
  const ownerMembership = randomUUID();
  const owner = randomUUID();
  const peerUser = randomUUID();
  const peerMembership = randomUUID();
  const peer = randomUUID();
  const customer = randomUUID();
  const order = randomUUID();
  const evidence = randomUUID();
  const ownTask = randomUUID();
  const peerTask = randomUUID();
  const email = `task-detail-${stamp}@example.test`;
  try {
    await c.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,'Task detail organization','team','active',null,null)",
      [organization, tenant, `task-detail-org-${stamp}`],
    );
    for (const [user, membership, employeeId, employeeEmail, code] of [
      [ownerUser, ownerMembership, owner, email, `TD-${stamp}`],
      [peerUser, peerMembership, peer, `peer-${stamp}@example.test`, `PEER-${stamp}`],
    ]) {
      await c.query(
        "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
        [user, employeeEmail, employeeId === owner ? 'Task Detail Owner' : 'Task Detail Peer'],
      );
      await c.query(
        "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
        [membership, tenant, user],
      );
      await c.query(
        'insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,$4)',
        [randomUUID(), tenant, membership, '00000000-0000-4000-8000-000000000004'],
      );
      await c.query(
        "insert into employees(id,tenant_id,membership_id,organization_id,employee_code,title,status,created_by,updated_by) values($1,$2,$3,$4,$5,'Advisor','active',null,null)",
        [employeeId, tenant, membership, organization, code],
      );
    }
    await c.query(
      "insert into customers(id,tenant_id,display_name,status,created_by,updated_by) values($1,$2,'Evidence customer','active',null,null)",
      [customer, tenant],
    );
    await c.query(
      "insert into customer_orders(id,tenant_id,customer_id,order_number,occurred_at,status,created_by,updated_by) values($1,$2,$3,$4,now(),'active',null,null)",
      [order, tenant, customer, `TD-ORDER-${stamp}`],
    );
    const content = Buffer.from('task-detail-evidence');
    await c.query(
      "insert into evidence_files(id,tenant_id,order_id,evidence_type,original_filename,media_type,byte_size,content_sha256,content,status,created_by,updated_by) values($1,$2,$3,'receipt','receipt.png','image/png',$4,$5,$6,'active',null,null)",
      [
        evidence,
        tenant,
        order,
        content.length,
        createHash('sha256').update(content).digest('hex'),
        content,
      ],
    );
    await c.query(
      "insert into tasks(id,tenant_id,customer_id,assignee_employee_id,title,reason,due_at,status,created_by,updated_by) values($1,$2,$3,$4,'Confirm customer receipt','Customer asked for a receipt confirmation.',now()+interval '1 hour','open',null,null)",
      [ownTask, tenant, customer, owner],
    );
    await c.query(
      "insert into tasks(id,tenant_id,assignee_employee_id,title,due_at,status,created_by,updated_by) values($1,$2,$3,'Peer-only task',now()+interval '1 hour','open',null,null)",
      [peerTask, tenant, peer],
    );
    const token = await login(email);
    const detailResponse = await fetch(`${base}/api/v1/employee/tasks/${ownTask}`, {
      headers: headers(token),
    });
    assert.equal(detailResponse.status, 200);
    const detail = await detailResponse.json();
    assert.equal(detail.data.task.reason, 'Customer asked for a receipt confirmation.');
    assert.equal(detail.data.customer.displayName, 'Evidence customer');
    assert.deepEqual(detail.data.availableEvidence[0], {
      id: evidence,
      evidence_type: 'receipt',
      original_filename: 'receipt.png',
      media_type: 'image/png',
      byte_size: content.length,
      created_at: detail.data.availableEvidence[0].created_at,
    });
    assert.equal('content' in detail.data.availableEvidence[0], false);
    assert.equal(
      (
        await fetch(`${base}/api/v1/employee/tasks/${ownTask}`, {
          headers: { 'x-request-id': randomUUID() },
        })
      ).status,
      401,
    );
    assert.equal(
      (await fetch(`${base}/api/v1/employee/tasks/${peerTask}`, { headers: headers(token) }))
        .status,
      404,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/employee/tasks/${ownTask}`, {
          headers: headers(token, { 'x-tenant-context': randomUUID() }),
        })
      ).status,
      403,
    );
    const key = `link-${stamp}`;
    const linkRequest = () =>
      fetch(`${base}/api/v1/employee/tasks/${ownTask}/evidence-links`, {
        method: 'POST',
        headers: headers(token, { 'idempotency-key': key }),
        body: JSON.stringify({ evidenceId: evidence }),
      });
    const linked = await linkRequest();
    assert.equal(linked.status, 201);
    const linkedData = (await linked.json()).data;
    assert.equal(linkedData.evidence_file_id, evidence);
    const replay = await linkRequest();
    assert.equal(replay.status, 201);
    assert.deepEqual((await replay.json()).data, linkedData);
    const duplicate = await fetch(`${base}/api/v1/employee/tasks/${ownTask}/evidence-links`, {
      method: 'POST',
      headers: headers(token, { 'idempotency-key': `another-${stamp}` }),
      body: JSON.stringify({ evidenceId: evidence }),
    });
    assert.equal(duplicate.status, 409);
    const complete = await fetch(`${base}/api/v1/employee/tasks/${ownTask}/complete`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ version: 1 }),
    });
    assert.equal(complete.status, 201);
    assert.deepEqual((await complete.json()).data, {
      id: ownTask,
      status: 'completed',
      version: 2,
    });
    const proof = await c.query(
      "select (select count(*) from task_evidence_links where tenant_id=$1 and task_id=$2)::int as links,(select count(*) from audit_logs where tenant_id=$1 and resource_id=$2 and action='employee.task_evidence_linked')::int as audits,(select count(*) from outbox_events where tenant_id=$1 and aggregate_id=$2 and event_type='employee.task.evidence_linked.v1')::int as outbox,(select count(*) from idempotency_keys where tenant_id=$1 and resource_type='task_evidence_link' and idempotency_key=$3)::int as keys",
      [tenant, ownTask, key],
    );
    assert.deepEqual(proof.rows[0], { links: 1, audits: 1, outbox: 1, keys: 1 });
  } finally {
    await c.end();
  }
});
