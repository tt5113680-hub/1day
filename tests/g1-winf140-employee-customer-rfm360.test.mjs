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
const base = 'http://127.0.0.1:3083';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3083',
    DATABASE_URL: db,
    AUTH_TOKEN_SECRET: 'g1-winf140-employee-customer-rfm360',
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

test('G1-W∞-140: static surface — employee customer detail exposes RFM/复购 360 互动轴 + honest', () => {
  const svc = read('apps/api/src/employee-customer-detail.service.ts');
  const page = read('apps/employee-web/app/e/customers/[id]/customer-detail.tsx');
  assert.match(svc, /customer_rfm_profiles/);
  assert.match(svc, /recency_days/);
  assert.match(svc, /task_follow_ups/);
  assert.match(svc, /rfm\.rows\[0\]/);
  assert.match(svc, /followUps/);
  assert.match(page, /RFM 分层/);
  assert.match(page, /跟进\/复购互动/);
  assert.match(page, /客户 360 互动轴/);
  assert.match(page, /客户跟进互动/);
  assert.match(page, /data\.rfm/);
  assert.match(page, /data\.followUps/);
  assert.doesNotMatch(svc, /Math\.random/);
});

test('G1-W∞-140: RFM/复购 360 derives from existing customer_rfm_profiles (single source of truth, 禁止假 BI)', () => {
  const page = read('apps/employee-web/app/e/customers/[id]/customer-detail.tsx');
  assert.match(page, /layerLabel = data\.rfm\?\.layer/);
  assert.match(page, /rfm360Dist/);
  assert.match(page, /frequencyBucket/);
  assert.match(page, /reachBucket/);
  assert.match(page, /recencyBucket/);
  assert.doesNotMatch(page, /mockMetrics|Math\.random\(|假分层/);
});

test('G1-W∞-140: honest boundaries preserved on employee customer detail', () => {
  const page = read('apps/employee-web/app/e/customers/[id]/customer-detail.tsx');
  assert.match(page, /source=local/);
  assert.match(page, /非本平台下单/);
  assert.match(page, /不含第三方订单履约/);
  assert.match(page, /互动 RFM 分层/);
  assert.match(page, /不作复购成交/);
  assert.doesNotMatch(page, /本平台收款/);
});

test('G1-W∞-140: RFM + follow-up 360 axis round-trips with real DB (employee-scoped, fail-closed)', async () => {
  await ready();
  const client = new Client({ connectionString: db });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const organization = randomUUID();
  const worker = { user: randomUUID(), membership: randomUUID(), employee: randomUUID() };
  const customer = randomUUID();
  const task = randomUUID();
  const foreign = randomUUID();
  try {
    await client.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,$4,'team','active',null,null)",
      [organization, tenant, `o140-${stamp}`, `O140 ${stamp}`],
    );
    await client.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
      [worker.user, `E140-${stamp}@example.test`, 'E140 worker'],
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
      [worker.employee, tenant, worker.membership, organization, `E140E-${stamp}`],
    );
    // a customer owned by the worker (so the employee customer detail resolves it)
    await client.query(
      "insert into customers(id,tenant_id,display_name,status,created_by,updated_by) values($1,$2,'E140 customer','active',null,null)",
      [customer, tenant],
    );
    await client.query(
      "insert into customer_ownerships(id,tenant_id,customer_id,employee_id,ownership_role,status,created_by,updated_by) values($1,$2,$3,$4,'owner','active',null,null)",
      [randomUUID(), tenant, customer, worker.employee],
    );
    // a task on the customer assigned to the worker + a follow-up
    await client.query(
      "insert into tasks(id,tenant_id,customer_id,assignee_employee_id,title,reason,due_at,status,created_by,updated_by) values($1,$2,$3,$4,'E140 follow','Trace',now()+interval '2 day','open',null,null)",
      [task, tenant, customer, worker.employee],
    );
    await client.query(
      "insert into task_follow_ups(id,tenant_id,task_id,employee_id,action_type,summary,created_by,updated_by) values($1,$2,$3,$4,'call','E140 首次跟进',null,null)",
      [randomUUID(), tenant, task, worker.employee],
    );
    // a single-source-of-truth RFM profile
    await client.query(
      `insert into customer_rfm_profiles(id,tenant_id,customer_id,recency_days,frequency_count,reach_count,layer,window_days,computed_at,created_by,updated_by)
       values($1,$2,$3,$4,$5,$6,$7,$8,now(),null,null)`,
      [randomUUID(), tenant, customer, 5, 3, 2, '温和互动', 90],
    );

    const token = await login(`E140-${stamp}@example.test`);
    const response = await fetch(`${base}/api/v1/employee/customers/${customer}`, {
      method: 'GET',
      headers: headers(token),
    });
    assert.equal(response.status, 200, await response.clone().text());
    const data = (await response.json()).data;
    assert.ok(data.rfm, 'rfm profile returned');
    assert.equal(data.rfm.layer, '温和互动', 'layer from single source');
    assert.equal(data.rfm.recencyDays, 5);
    assert.equal(data.rfm.frequencyCount, 3);
    assert.equal(data.rfm.windowDays, 90);
    assert.ok(Array.isArray(data.followUps), 'followUps array returned');
    assert.equal(data.followUps.length, 1, 'one worker-scoped follow-up');
    assert.equal(data.followUps[0].summary, 'E140 首次跟进');

    // cross-tenant / foreign customer 404 (fail-closed): a customer the worker does not own
    await client.query(
      "insert into customers(id,tenant_id,display_name,status,created_by,updated_by) values($1,$2,'foreign','active',null,null)",
      [foreign, tenant],
    );
    const denied = await fetch(`${base}/api/v1/employee/customers/${foreign}`, {
      method: 'GET',
      headers: headers(token),
    });
    assert.ok([401, 403, 404].includes(denied.status), 'foreign customer denied');
  } finally {
    await client
      .query(
        'delete from customer_ownerships where tenant_id=$1 and customer_id=$2',
        [tenant, customer],
      )
      .catch(() => undefined);
    await client
      .query('delete from task_follow_ups where tenant_id=$1 and task_id=$2', [tenant, task])
      .catch(() => undefined);
    await client
      .query('delete from tasks where tenant_id=$1 and customer_id=$2', [tenant, customer])
      .catch(() => undefined);
    await client
      .query('delete from customer_rfm_profiles where tenant_id=$1 and customer_id=$2', [
        tenant,
        customer,
      ])
      .catch(() => undefined);
    await client
      .query('delete from customer_sources where tenant_id=$1 and customer_id=$2', [
        tenant,
        customer,
      ])
      .catch(() => undefined);
    await client
      .query('delete from customers where tenant_id=$1 and (id=$2 or id=$3)', [
        tenant,
        customer,
        foreign,
      ])
      .catch(() => undefined);
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
