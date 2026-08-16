/* global fetch */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { URL } from 'node:url';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const base = 'http://127.0.0.1:3285';
const systemTenant = '00000000-0000-4000-8000-000000000001';
const tenantAdminRole = '00000000-0000-4000-8000-000000000004';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

test('G1-W∞-132: static — retention-depth + dormant wake routes', () => {
  const service = read('apps/api/src/management-crm-depth.service.ts');
  assert.match(service, /retentionDepth/);
  assert.match(service, /wakeDormant/);
  assert.match(service, /沉睡唤醒/);
  assert.match(service, /avg_days/);
  const controller = read('apps/api/src/management-crm-depth.controller.ts');
  assert.match(controller, /retention-depth/);
  assert.match(controller, /dormant-queue\/wake/);
  const page = read('apps/management-web/app/m/customers/page.tsx');
  assert.match(page, /customers-retention-depth/);
  assert.match(page, /customers-dormant-queue/);
  assert.match(page, /dormant-queue\/wake/);
});

const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3285',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'g1-winf132-crm-retention',
  },
  stdio: 'ignore',
});

async function ready() {
  for (let i = 0; i < 60; i += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      // starting
    }
    await wait(100);
  }
  throw new Error('API not ready');
}

async function login(email) {
  const response = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'ChangeMe123!',
      tenantId: systemTenant,
    }),
  });
  assert.equal(response.status, 201);
  return (await response.json()).accessToken;
}

test.after(() => api.kill());

test('G1-W∞-132: retention-depth + wake queue round-trip', async () => {
  await ready();
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const organization = randomUUID();
  const owner = { user: randomUUID(), membership: randomUUID(), employee: randomUUID() };
  const customerId = randomUUID();
  const customerId2 = randomUUID();
  try {
    await client.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,'W132 org','team','active',null,null)",
      [organization, systemTenant, `w132-${stamp}`],
    );
    await client.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
      [owner.user, `W132OWN-${stamp}@example.test`, 'W132 owner'],
    );
    await client.query(
      "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [owner.membership, systemTenant, owner.user],
    );
    await client.query(
      'insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,$4)',
      [randomUUID(), systemTenant, owner.membership, tenantAdminRole],
    );
    await client.query(
      "insert into employees(id,tenant_id,membership_id,organization_id,employee_code,title,status,created_by,updated_by) values($1,$2,$3,$4,$5,'Advisor','active',null,null)",
      [owner.employee, systemTenant, owner.membership, organization, `W132E-${stamp}`],
    );
    await client.query(
      "insert into customers(id,tenant_id,display_name,status,created_by,updated_by) values($1,$2,'W132 Dormant','active',null,null),($3,$2,'W132 Wake','active',null,null)",
      [customerId, systemTenant, customerId2],
    );
    await client.query(
      "update customers set created_at=date_trunc('month', now()) - interval '1 month' where id=$1",
      [customerId],
    );
    // recency_days=999999 so this row wins dormantQueue order (limit 100) amid seeded system-tenant RFM noise
    await client.query(
      `insert into customer_rfm_profiles(id,tenant_id,customer_id,recency_days,frequency_count,reach_count,layer,window_days,computed_at,created_by,updated_by)
       values($1,$2,$3,999999,0,0,'沉睡',90,now(),null,null),($4,$2,$5,45,1,1,'需唤醒',90,now(),null,null)`,
      [randomUUID(), systemTenant, customerId, randomUUID(), customerId2],
    );
  } finally {
    await client.end();
  }

  const token = await login(`W132OWN-${stamp}@example.test`);
  const auth = {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
    'x-tenant-context': systemTenant,
  };

  const retention = await fetch(`${base}/api/v1/management/customers/retention-depth?months=6`, {
    headers: { ...auth, 'x-request-id': randomUUID() },
  });
  const retentionText = await retention.text();
  assert.equal(retention.status, 200, retentionText);
  const body = JSON.parse(retentionText).data;
  assert.ok(Array.isArray(body.cohort));
  assert.equal(typeof body.repurchaseCycle.avgDays, 'number');
  assert.ok(Array.isArray(body.dormantQueue));
  assert.ok(body.dormantQueue.some((row) => row.customerId === customerId));
  assert.ok(body.dormantQueue.some((row) => row.customerId === customerId2));

  const wake = await fetch(`${base}/api/v1/management/customers/dormant-queue/wake`, {
    method: 'POST',
    headers: {
      ...auth,
      'x-request-id': randomUUID(),
      'idempotency-key': `wake-${stamp}`,
    },
    body: JSON.stringify({ customerIds: [customerId, customerId2] }),
  });
  const wakeText = await wake.text();
  assert.equal(wake.status, 201, wakeText);
  const wakeBody = JSON.parse(wakeText).data;
  assert.equal(wakeBody.applied, 2, wakeText);
  assert.equal(wakeBody.label, '沉睡唤醒');

  const again = await fetch(`${base}/api/v1/management/customers/retention-depth?months=6`, {
    headers: { ...auth, 'x-request-id': randomUUID() },
  });
  const againText = await again.text();
  assert.equal(again.status, 200, againText);
  const againBody = JSON.parse(againText).data;
  assert.ok(
    againBody.dormantQueue
      .filter((row) => [customerId, customerId2].includes(row.customerId))
      .every((row) => row.wakePlanned === true),
  );

  const deny = await fetch(`${base}/api/v1/management/customers/retention-depth`, {
    headers: { 'x-request-id': randomUUID() },
  });
  assert.ok([401, 403].includes(deny.status));
});
