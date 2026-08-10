/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const base = 'http://127.0.0.1:3272';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3272',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'sys-6-membership-scopes',
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

async function login(email, password, tenantId) {
  const response = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, tenantId }),
  });
  assert.equal(response.status, 201);
  return (await response.json()).accessToken;
}

test.after(() => api.kill());

test('SYS-6: store managers may grant memberships only on scoped stores', async () => {
  await ready();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const tenantId = randomUUID();
  const ownerId = randomUUID();
  const managerId = randomUUID();
  const ownerRoleId = randomUUID();
  const managerRoleId = randomUUID();
  const ownerMembershipId = randomUUID();
  const managerMembershipId = randomUUID();
  const orgId = randomUUID();
  const merchantId = randomUUID();
  const managerEmployeeId = randomUUID();
  const storeA = randomUUID();
  const storeB = randomUUID();
  const benefitA = randomUUID();
  const benefitB = randomUUID();
  const customerA = randomUUID();
  const customerB = randomUUID();
  const enrollmentA = randomUUID();
  const enrollmentB = randomUUID();
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(
      "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [tenantId, `sys6-member-${stamp}`, `SYS6 Member ${stamp}`],
    );
    for (const [id, email, name] of [
      [ownerId, `owner-member-${stamp}@example.local`, 'Owner'],
      [managerId, `manager-member-${stamp}@example.local`, 'Manager'],
    ]) {
      await client.query(
        "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
        [id, email, name],
      );
    }
    await client.query(
      "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null),($4,$2,$5,'active',null,null)",
      [ownerMembershipId, tenantId, ownerId, managerMembershipId, managerId],
    );
    await client.query(
      "insert into roles(id,tenant_id,code,name,status,created_by,updated_by) values($1,$2,$3,'Owner','active',null,null),($4,$2,$5,'Store Manager','active',null,null)",
      [ownerRoleId, tenantId, `owner_${stamp}`, managerRoleId, `store_manager_${stamp}`],
    );
    await client.query(
      'insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,$4),($5,$2,$6,$7)',
      [
        randomUUID(),
        tenantId,
        ownerMembershipId,
        ownerRoleId,
        randomUUID(),
        managerMembershipId,
        managerRoleId,
      ],
    );
    const tenantManage = (
      await client.query("select id from permissions where code='tenant.manage' limit 1")
    ).rows[0].id;
    const tenantRead = (
      await client.query("select id from permissions where code='tenant.read' limit 1")
    ).rows[0].id;
    await client.query(
      "insert into role_permissions(id,tenant_id,role_id,permission_id,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null)",
      [randomUUID(), tenantId, ownerRoleId, tenantManage],
    );
    await client.query(
      "insert into role_permissions(id,tenant_id,role_id,permission_id,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null)",
      [randomUUID(), tenantId, managerRoleId, tenantRead],
    );
    await client.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,$4,'merchant','active',null,null)",
      [orgId, tenantId, `ORG-${stamp}`, `Org ${stamp}`],
    );
    await client.query(
      "insert into merchants(id,tenant_id,organization_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,$5,'active',null,null)",
      [merchantId, tenantId, orgId, `M-${stamp}`, `Merchant ${stamp}`],
    );
    await client.query(
      "insert into employees(id,tenant_id,membership_id,organization_id,employee_code,title,status,created_by,updated_by) values($1,$2,$3,$4,$5,'Store Manager','active',null,null)",
      [managerEmployeeId, tenantId, managerMembershipId, orgId, `EM-${stamp}`],
    );
    await client.query(
      "insert into stores(id,tenant_id,organization_id,merchant_id,code,name,status,version,created_by,updated_by) values($1,$2,$3,$4,$5,$6,'active',1,null,null),($7,$2,$3,$4,$8,$9,'active',1,null,null)",
      [
        storeA,
        tenantId,
        orgId,
        merchantId,
        `A-${stamp}`,
        `Store A ${stamp}`,
        storeB,
        `B-${stamp}`,
        `Store B ${stamp}`,
      ],
    );
    await client.query(
      "insert into store_managers(id,tenant_id,store_id,employee_id,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null)",
      [randomUUID(), tenantId, storeA, managerEmployeeId],
    );
    await client.query(
      "insert into data_scopes(id,tenant_id,membership_id,scope_type,scope_value,status,created_by,updated_by) values($1,$2,$3,'store',$4,'active',null,null)",
      [randomUUID(), tenantId, managerMembershipId, storeA],
    );
    await client.query(
      "insert into store_benefits(id,tenant_id,store_id,title,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null),($5,$2,$6,$7,'active',null,null)",
      [
        benefitA,
        tenantId,
        storeA,
        `Benefit A ${stamp}`,
        benefitB,
        storeB,
        `Benefit B ${stamp}`,
      ],
    );
    await client.query(
      "insert into customers(id,tenant_id,display_name,created_by,updated_by) values($1,$2,$3,null,null),($4,$2,$5,null,null)",
      [customerA, tenantId, 'Member A', customerB, 'Member B'],
    );
    await client.query(
      "insert into membership_enrollments(id,tenant_id,customer_id,store_id,member_code,enrollment_status,source,joined_at,created_by,updated_by) values($1,$2,$3,$4,$5,'active','test',now(),null,null),($6,$2,$7,$8,$9,'active','test',now(),null,null)",
      [
        enrollmentA,
        tenantId,
        customerA,
        storeA,
        'AAAAAAAAAAAA',
        enrollmentB,
        customerB,
        storeB,
        'BBBBBBBBBBBB',
      ],
    );
  } finally {
    await client.end();
  }

  const managerToken = await login(
    `manager-member-${stamp}@example.local`,
    'ChangeMe123!',
    tenantId,
  );
  const headers = (extra = {}) => ({
    authorization: `Bearer ${managerToken}`,
    'x-tenant-context': tenantId,
    'x-request-id': randomUUID(),
    'content-type': 'application/json',
    ...extra,
  });

  const list = await fetch(`${base}/api/v1/management/memberships`, { headers: headers() });
  assert.equal(list.status, 200);
  const listed = (await list.json()).data;
  assert.deepEqual(
    listed.enrollments.map((row) => row.id),
    [enrollmentA],
  );
  assert.deepEqual(
    listed.benefits.map((row) => row.id),
    [benefitA],
  );

  const grantOk = await fetch(`${base}/api/v1/management/memberships/${enrollmentA}/grants`, {
    method: 'POST',
    headers: headers({ 'idempotency-key': randomUUID() }),
    body: JSON.stringify({ benefitId: benefitA, quantity: 1 }),
  });
  assert.equal(grantOk.status, 201);

  const grantDenied = await fetch(`${base}/api/v1/management/memberships/${enrollmentB}/grants`, {
    method: 'POST',
    headers: headers({ 'idempotency-key': randomUUID() }),
    body: JSON.stringify({ benefitId: benefitB, quantity: 1 }),
  });
  assert.equal(grantDenied.status, 403);

  const menu = await fetch(`${base}/api/v1/me/menu?product=management`, {
    headers: headers(),
  });
  assert.equal(menu.status, 200);
  assert.deepEqual(
    (await menu.json()).data.items.map((item) => item.key),
    ['overview', 'stores', 'offers', 'memberships', 'content'],
  );
});
