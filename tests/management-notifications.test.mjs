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
const base = 'http://127.0.0.1:3076';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3076',
    DATABASE_URL: db,
    AUTH_TOKEN_SECRET: 'management-notifications',
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
test('management notification center aggregates tenant-scoped workflow/anomaly/approval with private reads', async () => {
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
  const definition = randomUUID();
  const version = randomUUID();
  const instance = randomUUID();
  const readerRole = randomUUID();
  const perms = {};
  try {
    await client.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,'Notification org','team','active',null,null)",
      [organization, tenant, `mgmt-notif-${stamp}`],
    );
    await client.query(
      "insert into roles(id,tenant_id,code,name,status,created_by,updated_by) values($1,$2,$3,'Reader','active',null,null)",
      [readerRole, tenant, `reader-${stamp}`],
    );
    for (const [person, name, code] of [
      [owner, 'Mgmt notif owner', 'OWNER'],
      [peer, 'Mgmt notif reader', 'READER'],
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
    const ownerToken = await login(`${'OWNER'}-${stamp}@example.test`);
    const peerToken = await login(`${'READER'}-${stamp}@example.test`);
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/notifications`, {
          headers: { 'x-request-id': randomUUID() },
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/notifications`, {
          headers: headers(ownerToken, { 'x-tenant-context': randomUUID() }),
        })
      ).status,
      403,
    );
    const list = await fetch(`${base}/api/v1/management/notifications`, {
      headers: headers(ownerToken),
    });
    assert.equal(list.status, 200);
    const payload = (await list.json()).data;
    assert.deepEqual(
      new Set(payload.items.map((item) => item.category)),
      new Set(['anomaly', 'approval', 'workflow']),
    );
    assert.equal(typeof payload.counts.anomaly, 'number');
    assert.equal(typeof payload.counts.approval, 'number');
    assert.equal(typeof payload.counts.workflow, 'number');
    const myAnomaly = payload.items.find((item) => item.id === task);
    assert.ok(myAnomaly, 'seeded overdue task surfaced as anomaly');
    assert.equal(myAnomaly.category, 'anomaly');
    assert.ok(myAnomaly.title.includes('任务逾期'));
    assert.ok(
      payload.items.some((item) => item.id === approval && item.category === 'approval'),
      'seeded ownership approval surfaced',
    );
    assert.ok(
      payload.items.some((item) => item.id === instance && item.category === 'workflow'),
      'seeded active workflow surfaced',
    );
    assert.ok(
      payload.items.every(
        (item) => item.deepLink === '/m/customers' || item.deepLink === '/m/workflows',
      ),
    );
    const anomaly = await fetch(`${base}/api/v1/management/notifications?category=anomaly`, {
      headers: headers(ownerToken),
    });
    assert.equal(anomaly.status, 200);
    const anomalyData = (await anomaly.json()).data;
    assert.ok(anomalyData.items.length, 'anomaly bucket is non-empty');
    assert.ok(
      anomalyData.items.every((item) => item.category === 'anomaly'),
      'category=anomaly filters to anomaly only',
    );
    assert.ok(
      anomalyData.items.some((item) => item.id === task),
      'seeded overdue task present in anomaly bucket',
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/notifications?category=unknown`, {
          headers: headers(ownerToken),
        })
      ).status,
      400,
    );
    const peerList = await fetch(`${base}/api/v1/management/notifications`, {
      headers: headers(peerToken),
    });
    assert.equal(peerList.status, 403);
  } finally {
    await client.end();
  }
});
