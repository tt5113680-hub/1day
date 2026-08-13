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
const base = 'http://127.0.0.1:3090';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3090',
    DATABASE_URL: db,
    AUTH_TOKEN_SECRET: 'g1-winf117-management-notification-depth',
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
  for (let i = 0; i < 30; i += 1) {
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
test('management notification read/ignore/batch + settings audit depth (MPC-13/MPC-12)', async () => {
  await ready();
  const client = new Client({ connectionString: db });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const organization = randomUUID();
  const owner = { user: randomUUID(), membership: randomUUID(), employee: randomUUID() };
  const customer = randomUUID();
  const task = randomUUID();
  const approval = randomUUID();
  const definition = randomUUID();
  const version = randomUUID();
  const instance = randomUUID();
  try {
    await client.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,'Notification org','team','active',null,null)",
      [organization, tenant, `winf117-${stamp}`],
    );
    await client.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
      [owner.user, `WIN117-${stamp}@example.test`, 'W117 owner'],
    );
    await client.query(
      "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [owner.membership, tenant, owner.user],
    );
    await client.query(
      'insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,$4)',
      [randomUUID(), tenant, owner.membership, '00000000-0000-4000-8000-000000000004'],
    );
    await client.query(
      "insert into employees(id,tenant_id,membership_id,organization_id,employee_code,title,status,created_by,updated_by) values($1,$2,$3,$4,$5,'Advisor','active',null,null)",
      [owner.employee, tenant, owner.membership, organization, `W117-${stamp}`],
    );
    await client.query(
      "insert into customers(id,tenant_id,display_name,status,created_by,updated_by) values($1,$2,'Notification customer','active',null,null)",
      [customer, tenant],
    );
    await client.query(
      "insert into tasks(id,tenant_id,customer_id,assignee_employee_id,title,reason,due_at,status,created_by,updated_by) values($1,$2,$3,$4,'Call notification customer','Trace proof',now()-interval '1 hour','overdue',null,null)",
      [task, tenant, customer, owner.employee],
    );
    await client.query(
      "insert into customer_ownership_transfer_approvals(id,tenant_id,customer_id,from_employee_id,to_employee_id,reason,requested_version,status,created_by,updated_by) values($1,$2,$3,null,$4,'Ownership handoff',1,'pending',null,null)",
      [approval, tenant, customer, owner.employee],
    );
    await client.query(
      "insert into workflow_definitions(id,tenant_id,code,name,status,created_by,updated_by) values($1,$2,$3,'Entry integration','active',null,null)",
      [definition, tenant, `wf-${stamp}`],
    );
    await client.query(
      "insert into workflow_versions(id,tenant_id,definition_id,sequence,status,created_by,updated_by) values($1,$2,$3,1,'active',null,null)",
      [version, tenant, definition],
    );
    await client.query(
      "insert into workflow_instances(id,tenant_id,definition_id,workflow_version_id,context,status,created_by,updated_by) values($1,$2,$3,$4,'{}','active',null,null)",
      [instance, tenant, definition, version],
    );

    const token = await login(`WIN117-${stamp}@example.test`);

    // unauthorized + cross-tenant deny
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/notifications/batch`, {
          method: 'POST',
          headers: { 'x-request-id': randomUUID(), 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'ignore', ids: [task] }),
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/notifications/batch`, {
          method: 'POST',
          headers: headers(token, { 'x-tenant-context': randomUUID() }),
          body: JSON.stringify({ action: 'ignore', ids: [task] }),
        })
      ).status,
      403,
    );

    // list materializes stable notificationIds + readAt/status/version
    const list = await fetch(`${base}/api/v1/management/notifications`, {
      headers: headers(token),
    });
    assert.equal(list.status, 200);
    const payload = (await list.json()).data;
    assert.ok(payload.items.length >= 3, 'materialized anomaly+approval+workflow');
    const myAnomaly = payload.items.find((item) => item.id === task && item.category === 'anomaly');
    assert.ok(myAnomaly, 'overdue task surfaced as anomaly');
    assert.ok(myAnomaly.notificationId && myAnomaly.version >= 1, 'stable notificationId+version');
    assert.equal(myAnomaly.readAt, null);
    assert.equal(myAnomaly.status, 'active');

    // invalid batch action + over-limit
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/notifications/batch`, {
          method: 'POST',
          headers: headers(token),
          body: JSON.stringify({ action: 'nope', ids: [task] }),
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/notifications/batch`, {
          method: 'POST',
          headers: headers(token),
          body: JSON.stringify({ action: 'ignore', ids: 'not-an-array' }),
        })
      ).status,
      400,
    );

    // single mark-read with optimistic lock + idempotency replay
    const read = await fetch(
      `${base}/api/v1/management/notifications/${myAnomaly.notificationId}/read`,
      {
        method: 'PATCH',
        headers: headers(token, { 'idempotency-key': `w117-read-${stamp}-1` }),
        body: JSON.stringify({ version: myAnomaly.version }),
      },
    );
    assert.equal(read.status, 200);
    const readData = (await read.json()).data;
    assert.ok(readData.readAt, 'readAt set after markRead');
    assert.equal(readData.version, myAnomaly.version + 1);
    const replay = await fetch(
      `${base}/api/v1/management/notifications/${myAnomaly.notificationId}/read`,
      {
        method: 'PATCH',
        headers: headers(token, { 'idempotency-key': `w117-read-${stamp}-1` }),
        body: JSON.stringify({ version: myAnomaly.version + 1 }),
      },
    );
    assert.equal(replay.status, 200);
    assert.deepEqual(
      (await replay.json()).data,
      readData,
      'idempotent replay returns same payload',
    );
    // stale version -> 409
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/notifications/${myAnomaly.notificationId}/read`, {
          method: 'PATCH',
          headers: headers(token, { 'idempotency-key': `w117-stale-${stamp}-1` }),
          body: JSON.stringify({ version: myAnomaly.version }),
        })
      ).status,
      409,
    );
    // unknown id -> 404
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/notifications/${randomUUID()}/read`, {
          method: 'PATCH',
          headers: headers(token, { 'idempotency-key': `w117-404-${stamp}-1` }),
          body: JSON.stringify({ version: 1 }),
        })
      ).status,
      404,
    );

    // state=read reflects marked-read + still visible under 'all'
    const readState = await fetch(`${base}/api/v1/management/notifications?state=read`, {
      headers: headers(token),
    });
    assert.equal(readState.status, 200);
    const readData2 = (await readState.json()).data;
    assert.ok(
      readData2.items.some((i) => i.notificationId === myAnomaly.notificationId && i.readAt),
      'marked-read notification visible under state=read',
    );
    const allAfter = await fetch(`${base}/api/v1/management/notifications`, {
      headers: headers(token),
    });
    assert.ok(
      (await allAfter.json()).data.items.some((i) => i.notificationId === myAnomaly.notificationId),
      'marked-read notification still visible under all',
    );

    // batch ignore two notifications
    const workflowNotif = payload.items.find(
      (item) => item.id === instance && item.category === 'workflow',
    );
    const approvalNotif = payload.items.find(
      (item) => item.id === approval && item.category === 'approval',
    );
    assert.ok(workflowNotif && approvalNotif);
    const batch = await fetch(`${base}/api/v1/management/notifications/batch`, {
      method: 'POST',
      headers: headers(token, { 'idempotency-key': `w117-batch-${stamp}-1` }),
      body: JSON.stringify({
        action: 'ignore',
        ids: [workflowNotif.notificationId, approvalNotif.notificationId],
      }),
    });
    assert.equal(batch.status, 200);
    const batchData = (await batch.json()).data;
    assert.equal(batchData.action, 'ignore');
    assert.equal(batchData.updatedCount, 2);
    // replay idempotent
    const batchReplay = await fetch(`${base}/api/v1/management/notifications/batch`, {
      method: 'POST',
      headers: headers(token, { 'idempotency-key': `w117-batch-${stamp}-1` }),
      body: JSON.stringify({
        action: 'ignore',
        ids: [workflowNotif.notificationId, approvalNotif.notificationId],
      }),
    });
    assert.equal(batchReplay.status, 200);
    assert.deepEqual((await batchReplay.json()).data, batchData);

    // ignored hidden from 'all' but visible under state=ignored
    const allIgnored = await fetch(`${base}/api/v1/management/notifications`, {
      headers: headers(token),
    });
    const allIds = (await allIgnored.json()).data.items.map((i) => i.notificationId);
    assert.ok(!allIds.includes(workflowNotif.notificationId), 'ignored hidden from all');
    assert.ok(!allIds.includes(approvalNotif.notificationId), 'ignored hidden from all');
    const ignoredState = await fetch(`${base}/api/v1/management/notifications?state=ignored`, {
      headers: headers(token),
    });
    const ignoredIds = (await ignoredState.json()).data.items.map((i) => i.notificationId);
    assert.ok(
      ignoredIds.includes(workflowNotif.notificationId) &&
        ignoredIds.includes(approvalNotif.notificationId),
      'ignored visible under state=ignored',
    );

    // batch unignore
    const unignore = await fetch(`${base}/api/v1/management/notifications/batch`, {
      method: 'POST',
      headers: headers(token, { 'idempotency-key': `w117-unignore-${stamp}-1` }),
      body: JSON.stringify({ action: 'unignore', ids: [workflowNotif.notificationId] }),
    });
    assert.equal(unignore.status, 200);
    assert.equal((await unignore.json()).data.updatedCount, 1);
    const afterUnignore = await fetch(`${base}/api/v1/management/notifications`, {
      headers: headers(token),
    });
    assert.ok(
      (await afterUnignore.json()).data.items.some(
        (i) => i.notificationId === workflowNotif.notificationId,
      ),
      'unignored notification visible under all',
    );

    // batch unread (mark read done notification back to unread)
    const unread = await fetch(`${base}/api/v1/management/notifications/batch`, {
      method: 'POST',
      headers: headers(token, { 'idempotency-key': `w117-unread-${stamp}-1` }),
      body: JSON.stringify({ action: 'unread', ids: [myAnomaly.notificationId] }),
    });
    assert.equal(unread.status, 200);
    assert.equal((await unread.json()).data.updatedCount, 1);
    const unreadState = await fetch(`${base}/api/v1/management/notifications?state=unread`, {
      headers: headers(token),
    });
    assert.ok(
      (await unreadState.json()).data.items.some(
        (i) => i.notificationId === myAnomaly.notificationId,
      ),
      'batch unread resets to unread',
    );

    // settings audit (MPC-12) — cross-tenant deny + returns settings change records
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/notifications/settings-audit`, {
          headers: headers(token, { 'x-tenant-context': randomUUID() }),
        })
      ).status,
      403,
    );
    const settingsPayloadResponse = await fetch(
      `${base}/api/v1/management/notifications/settings-audit`,
      { headers: headers(token) },
    );
    assert.equal(settingsPayloadResponse.status, 200);
    assert.equal(typeof (await settingsPayloadResponse.json()).data.count, 'number');

    // audit + outbox rows written for read/batch
    const audit = await client.query(
      "select action from audit_logs where tenant_id=$1 and resource_type='management_notification' order by created_at desc limit 5",
      [tenant],
    );
    const actions = audit.rows.map((row) => row.action);
    assert.ok(actions.includes('management.notification_read'), 'read audited');
    assert.ok(actions.includes('management.notification_batch'), 'batch audited');
    const outbox = await client.query(
      "select event_type from outbox_events where tenant_id=$1 and aggregate_type='management_notification' order by created_at desc limit 5",
      [tenant],
    );
    const events = outbox.rows.map((row) => row.event_type);
    assert.ok(events.includes('management.notification_read.v1'), 'read outbox');
    assert.ok(events.includes('management.notification_batch.v1'), 'batch outbox');
  } finally {
    await client.end();
  }
});
