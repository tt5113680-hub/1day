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
const base = 'http://127.0.0.1:3078';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3078', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'page-e-009-api' },
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
  const r = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'ChangeMe123!', tenantId: tenant }),
  });
  assert.equal(r.status, 201);
  return (await r.json()).accessToken;
}
test.after(() => api.kill());

test('employee profile scopes personal organization, stores, permissions and own notification preference', async () => {
  await ready();
  const c = new Client({ connectionString: db });
  await c.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const org = randomUUID(),
    merchant = randomUUID(),
    store = randomUUID();
  const owner = {
    user: randomUUID(),
    membership: randomUUID(),
    employee: randomUUID(),
    email: `profile-owner-${stamp}@example.test`,
  };
  const peer = {
    user: randomUUID(),
    membership: randomUUID(),
    employee: randomUUID(),
    email: `profile-peer-${stamp}@example.test`,
  };
  try {
    await c.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,'Profile org','team','active',null,null)",
      [org, tenant, `profile-${stamp}`],
    );
    await c.query(
      "insert into merchants(id,tenant_id,organization_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,'Profile merchant','active',null,null)",
      [merchant, tenant, org, `merchant-${stamp}`],
    );
    await c.query(
      "insert into stores(id,tenant_id,organization_id,merchant_id,code,name,address,status,created_by,updated_by) values($1,$2,$3,$4,$5,'Profile store','Safe street','active',null,null)",
      [store, tenant, org, merchant, `store-${stamp}`],
    );
    for (const [person, name, code] of [
      [owner, 'Profile owner', 'OWNER'],
      [peer, 'Profile peer', 'PEER'],
    ]) {
      await c.query(
        "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
        [person.user, person.email, name],
      );
      await c.query(
        "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
        [person.membership, tenant, person.user],
      );
      await c.query(
        "insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,'00000000-0000-4000-8000-000000000004')",
        [randomUUID(), tenant, person.membership],
      );
      await c.query(
        "insert into employees(id,tenant_id,membership_id,organization_id,employee_code,title,status,created_by,updated_by) values($1,$2,$3,$4,$5,'Advisor','active',null,null)",
        [person.employee, tenant, person.membership, org, `${code}-${stamp}`],
      );
    }
    const token = await login(owner.email);
    const peerToken = await login(peer.email);
    assert.equal(
      (
        await fetch(`${base}/api/v1/employee/profile`, {
          headers: { 'x-request-id': randomUUID() },
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/employee/profile`, {
          headers: headers(token, { 'x-tenant-context': randomUUID() }),
        })
      ).status,
      403,
    );
    const profile = await fetch(`${base}/api/v1/employee/profile`, { headers: headers(token) });
    assert.equal(profile.status, 200);
    const data = (await profile.json()).data;
    assert.equal(data.employee.id, owner.employee);
    assert.equal(data.organization.id, org);
    assert.equal(data.stores[0].id, store);
    assert.equal(data.permissions.includes('task.manage'), true);
    assert.deepEqual(data.notificationPreference, { doNotDisturbUntil: null, version: 0 });
    assert.equal(
      (
        await fetch(`${base}/api/v1/employee/profile/notification-preferences`, {
          method: 'POST',
          headers: headers(token),
          body: JSON.stringify({
            version: 0,
            doNotDisturbUntil: '2030-01-01T00:00:00.000Z',
            employeeId: peer.employee,
          }),
        })
      ).status,
      201,
    );
    const ownPreference = await c.query(
      'select employee_id,version from employee_notification_preferences where tenant_id=$1 and employee_id=$2',
      [tenant, owner.employee],
    );
    assert.deepEqual(ownPreference.rows[0], { employee_id: owner.employee, version: 1 });
    assert.equal(
      (
        await c.query(
          'select 1 from employee_notification_preferences where tenant_id=$1 and employee_id=$2',
          [tenant, peer.employee],
        )
      ).rowCount,
      0,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/employee/profile/notification-preferences`, {
          method: 'POST',
          headers: headers(token),
          body: JSON.stringify({ version: 0, doNotDisturbUntil: null }),
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/employee/profile/notification-preferences`, {
          method: 'POST',
          headers: headers(peerToken),
          body: JSON.stringify({ version: 0, doNotDisturbUntil: null }),
        })
      ).status,
      201,
    );
    const proof = await c.query(
      "select (select count(*) from audit_logs where tenant_id=$1 and resource_id=$2 and action='task.notification_preference_updated')::int as audits,(select count(*) from outbox_events where tenant_id=$1 and aggregate_id=$2 and event_type='employee.task.notification_preference_updated.v1')::int as outbox",
      [tenant, owner.employee],
    );
    assert.deepEqual(proof.rows[0], { audits: 1, outbox: 1 });
  } finally {
    await c.end();
  }
});
