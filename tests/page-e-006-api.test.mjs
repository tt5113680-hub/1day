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
const base = 'http://127.0.0.1:3068';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3068', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'page-e-006-api' },
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
test('employee lead pool persists claim, conversion and auditable allocation with tenant boundaries', async () => {
  await ready();
  const client = new Client({ connectionString: db });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const org = randomUUID();
  const owner = {
    user: randomUUID(),
    membership: randomUUID(),
    employee: randomUUID(),
    email: `lead-owner-${stamp}@example.test`,
  };
  const peer = {
    user: randomUUID(),
    membership: randomUUID(),
    employee: randomUUID(),
    email: `lead-peer-${stamp}@example.test`,
  };
  const customerIds = [randomUUID(), randomUUID(), randomUUID()];
  const leadIds = [randomUUID(), randomUUID(), randomUUID()];
  try {
    await client.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,'Lead pool org','team','active',null,null)",
      [org, tenant, `lead-${stamp}`],
    );
    for (const [person, name, code] of [
      [owner, 'Lead owner', 'OWNER'],
      [peer, 'Lead peer', 'PEER'],
    ]) {
      await client.query(
        "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
        [person.user, person.email, name],
      );
      await client.query(
        "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
        [person.membership, tenant, person.user],
      );
      await client.query(
        "insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,'00000000-0000-4000-8000-000000000004')",
        [randomUUID(), tenant, person.membership],
      );
      await client.query(
        "insert into employees(id,tenant_id,membership_id,organization_id,employee_code,title,status,created_by,updated_by) values($1,$2,$3,$4,$5,'Advisor','active',null,null)",
        [person.employee, tenant, person.membership, org, `${code}-${stamp}`],
      );
    }
    for (let index = 0; index < customerIds.length; index += 1) {
      await client.query(
        "insert into customers(id,tenant_id,display_name,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
        [customerIds[index], tenant, `Lead customer ${index + 1}`],
      );
      await client.query(
        "insert into employee_lead_pool_entries(id,tenant_id,customer_id,source_type,priority,status,created_by,updated_by) values($1,$2,$3,$4,$5,'available',null,null)",
        [
          leadIds[index],
          tenant,
          customerIds[index],
          index === 0 ? 'campaign' : 'store',
          index === 0 ? 'high' : 'normal',
        ],
      );
    }

    const token = await login(owner.email);
    const anonymous = await fetch(`${base}/api/v1/employee/leads`, {
      headers: { 'x-request-id': randomUUID() },
    });
    assert.equal(anonymous.status, 401);
    const wrongTenant = await fetch(`${base}/api/v1/employee/leads`, {
      headers: headers(token, { 'x-tenant-context': randomUUID() }),
    });
    assert.equal(wrongTenant.status, 403);

    const list = await fetch(`${base}/api/v1/employee/leads?status=available`, {
      headers: headers(token),
    });
    assert.equal(list.status, 200);
    assert.equal((await list.json()).data.filter((item) => leadIds.includes(item.id)).length, 3);
    const invalidFilter = await fetch(`${base}/api/v1/employee/leads?status=invalid`, {
      headers: headers(token),
    });
    assert.equal(invalidFilter.status, 400);
    const assignees = await fetch(`${base}/api/v1/employee/leads/assignees`, {
      headers: headers(token),
    });
    assert.equal(assignees.status, 200);
    assert.ok((await assignees.json()).data.some((item) => item.id === peer.employee));

    const claimKey = `claim-${stamp}`;
    const claim = () =>
      fetch(`${base}/api/v1/employee/leads/${leadIds[0]}/claim`, {
        method: 'POST',
        headers: headers(token, { 'idempotency-key': claimKey }),
        body: JSON.stringify({ version: 1 }),
      });
    const claimedResponse = await claim();
    assert.equal(claimedResponse.status, 201);
    const claimed = (await claimedResponse.json()).data;
    assert.equal(claimed.status, 'claimed');
    assert.equal(claimed.assigneeEmployeeId, owner.employee);
    const claimedReplay = await claim();
    assert.deepEqual((await claimedReplay.json()).data, claimed);
    const staleClaim = await fetch(`${base}/api/v1/employee/leads/${leadIds[0]}/claim`, {
      method: 'POST',
      headers: headers(token, { 'idempotency-key': `stale-${stamp}` }),
      body: JSON.stringify({ version: 1 }),
    });
    assert.equal(staleClaim.status, 409);

    const nurture = await fetch(`${base}/api/v1/employee/leads/${leadIds[0]}/convert`, {
      method: 'POST',
      headers: headers(token, { 'idempotency-key': `nurture-${stamp}` }),
      body: JSON.stringify({ version: claimed.version, destination: 'nurture' }),
    });
    assert.equal(nurture.status, 201);
    assert.equal((await nurture.json()).data.status, 'nurture');

    const lead2Claim = await fetch(`${base}/api/v1/employee/leads/${leadIds[1]}/claim`, {
      method: 'POST',
      headers: headers(token, { 'idempotency-key': `follow-claim-${stamp}` }),
      body: JSON.stringify({ version: 1 }),
    });
    const lead2 = (await lead2Claim.json()).data;
    const followUp = await fetch(`${base}/api/v1/employee/leads/${leadIds[1]}/convert`, {
      method: 'POST',
      headers: headers(token, { 'idempotency-key': `follow-up-${stamp}` }),
      body: JSON.stringify({
        version: lead2.version,
        destination: 'follow_up',
        taskTitle: 'Call lead customer 2',
        dueAt: new Date(Date.now() + 86400000).toISOString(),
      }),
    });
    assert.equal(followUp.status, 201);
    const followUpData = (await followUp.json()).data;
    assert.equal(followUpData.status, 'follow_up');
    assert.ok(followUpData.taskId);

    const allocated = await fetch(`${base}/api/v1/employee/leads/batch/assign`, {
      method: 'POST',
      headers: headers(token, { 'idempotency-key': `assign-${stamp}` }),
      body: JSON.stringify({ employeeId: peer.employee, items: [{ id: leadIds[2], version: 1 }] }),
    });
    assert.equal(allocated.status, 201);
    assert.equal((await allocated.json()).data.count, 1);
    const peerToken = await login(peer.email);
    const forbidden = await fetch(`${base}/api/v1/employee/leads/${leadIds[2]}/convert`, {
      method: 'POST',
      headers: headers(token, { 'idempotency-key': `wrong-owner-${stamp}` }),
      body: JSON.stringify({ version: 2, destination: 'nurture' }),
    });
    assert.equal(forbidden.status, 403);
    const peerConvert = await fetch(`${base}/api/v1/employee/leads/${leadIds[2]}/convert`, {
      method: 'POST',
      headers: headers(peerToken, { 'idempotency-key': `peer-convert-${stamp}` }),
      body: JSON.stringify({ version: 2, destination: 'nurture' }),
    });
    assert.equal(peerConvert.status, 201);

    const proof = await client.query(
      "select (select count(*) from employee_lead_pool_entries where tenant_id=$1 and id=any($2::uuid[]))::int as leads,(select count(*) from tasks where tenant_id=$1 and id=$3)::int as tasks,(select count(*) from audit_logs where tenant_id=$1 and resource_id=any($2::uuid[]) and action like 'employee.lead_%')::int as audits,(select count(*) from outbox_events where tenant_id=$1 and aggregate_id=any($2::uuid[]) and event_type like 'employee.lead_%')::int as outbox",
      [tenant, leadIds, followUpData.taskId],
    );
    assert.deepEqual(proof.rows[0], { leads: 3, tasks: 1, audits: 6, outbox: 6 });
  } finally {
    await client.end();
  }
});
