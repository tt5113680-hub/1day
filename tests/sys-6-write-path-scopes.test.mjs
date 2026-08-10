/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const base = 'http://127.0.0.1:3268';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3268',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'sys-6-write-path',
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

test('SYS-6: write-path scopes for redeem + store commercial', async () => {
  await ready();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const tenantId = randomUUID();
  const ownerId = randomUUID();
  const managerId = randomUUID();
  const employeeIdUser = randomUUID();
  const ownerRoleId = randomUUID();
  const managerRoleId = randomUUID();
  const employeeRoleId = randomUUID();
  const ownerMembershipId = randomUUID();
  const managerMembershipId = randomUUID();
  const employeeMembershipId = randomUUID();
  const orgId = randomUUID();
  const merchantId = randomUUID();
  const managerEmployeeId = randomUUID();
  const staffEmployeeId = randomUUID();
  const storeA = randomUUID();
  const storeB = randomUUID();
  const benefitA = randomUUID();
  const benefitB = randomUUID();
  const customerA = randomUUID();
  const customerB = randomUUID();
  const enrollmentA = randomUUID();
  const enrollmentB = randomUUID();
  const memberCodeA = 'AAAAAAAAAAAA';
  const memberCodeB = 'BBBBBBBBBBBB';
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(
      "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [tenantId, `sys6-write-${stamp}`, `SYS6 Write ${stamp}`],
    );
    for (const [id, email, name] of [
      [ownerId, `owner-write-${stamp}@example.local`, 'Owner'],
      [managerId, `manager-write-${stamp}@example.local`, 'Manager'],
      [employeeIdUser, `employee-write-${stamp}@example.local`, 'Employee'],
    ]) {
      await client.query(
        "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
        [id, email, name],
      );
    }
    await client.query(
      "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null),($4,$2,$5,'active',null,null),($6,$2,$7,'active',null,null)",
      [
        ownerMembershipId,
        tenantId,
        ownerId,
        managerMembershipId,
        managerId,
        employeeMembershipId,
        employeeIdUser,
      ],
    );
    await client.query(
      "insert into roles(id,tenant_id,code,name,status,created_by,updated_by) values($1,$2,$3,'Owner','active',null,null),($4,$2,$5,'Store Manager','active',null,null),($6,$2,$7,'Employee','active',null,null)",
      [
        ownerRoleId,
        tenantId,
        `owner_${stamp}`,
        managerRoleId,
        `store_manager_${stamp}`,
        employeeRoleId,
        `employee_${stamp}`,
      ],
    );
    await client.query(
      'insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,$4),($5,$2,$6,$7),($8,$2,$9,$10)',
      [
        randomUUID(),
        tenantId,
        ownerMembershipId,
        ownerRoleId,
        randomUUID(),
        managerMembershipId,
        managerRoleId,
        randomUUID(),
        employeeMembershipId,
        employeeRoleId,
      ],
    );
    const tenantManage = (
      await client.query("select id from permissions where code='tenant.manage' limit 1")
    ).rows[0].id;
    const tenantRead = (
      await client.query("select id from permissions where code='tenant.read' limit 1")
    ).rows[0].id;
    const taskManage = (
      await client.query("select id from permissions where code='task.manage' limit 1")
    ).rows[0].id;
    const taskRead = (
      await client.query("select id from permissions where code='task.read' limit 1")
    ).rows[0].id;
    await client.query(
      "insert into role_permissions(id,tenant_id,role_id,permission_id,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null)",
      [randomUUID(), tenantId, ownerRoleId, tenantManage],
    );
    await client.query(
      "insert into role_permissions(id,tenant_id,role_id,permission_id,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null),($5,$2,$3,$6,'active',null,null),($7,$2,$3,$8,'active',null,null)",
      [
        randomUUID(),
        tenantId,
        managerRoleId,
        tenantRead,
        randomUUID(),
        taskManage,
        randomUUID(),
        taskRead,
      ],
    );
    await client.query(
      "insert into role_permissions(id,tenant_id,role_id,permission_id,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null),($5,$2,$3,$6,'active',null,null)",
      [randomUUID(), tenantId, employeeRoleId, taskManage, randomUUID(), taskRead],
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
      "insert into employees(id,tenant_id,membership_id,organization_id,employee_code,title,status,created_by,updated_by) values($1,$2,$3,$4,$5,'Store Manager','active',null,null),($6,$2,$7,$4,$8,'Staff','active',null,null)",
      [
        managerEmployeeId,
        tenantId,
        managerMembershipId,
        orgId,
        `EM-${stamp}`,
        staffEmployeeId,
        employeeMembershipId,
        `ES-${stamp}`,
      ],
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
        memberCodeA,
        enrollmentB,
        customerB,
        storeB,
        memberCodeB,
      ],
    );
    await client.query(
      "insert into member_benefit_ledger(id,tenant_id,enrollment_id,benefit_id,store_id,entry_type,quantity,balance_after,business_reference,created_by,updated_by) values($1,$2,$3,$4,$5,'grant',2,2,$6,null,null),($7,$2,$8,$9,$10,'grant',2,2,$11,null,null)",
      [
        randomUUID(),
        tenantId,
        enrollmentA,
        benefitA,
        storeA,
        `seed-a-${stamp}`,
        randomUUID(),
        enrollmentB,
        benefitB,
        storeB,
        `seed-b-${stamp}`,
      ],
    );
  } finally {
    await client.end();
  }

  const managerToken = await login(
    `manager-write-${stamp}@example.local`,
    'ChangeMe123!',
    tenantId,
  );
  const employeeToken = await login(
    `employee-write-${stamp}@example.local`,
    'ChangeMe123!',
    tenantId,
  );

  const list = await fetch(`${base}/api/v1/management/stores`, {
    headers: {
      authorization: `Bearer ${managerToken}`,
      'x-tenant-context': tenantId,
      'x-request-id': randomUUID(),
    },
  });
  assert.equal(list.status, 200);
  const listed = (await list.json()).data;
  assert.deepEqual(
    listed.map((row) => row.id),
    [storeA],
  );

  const commercialOk = await fetch(`${base}/api/v1/management/stores/${storeA}/commercial`, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${managerToken}`,
      'x-tenant-context': tenantId,
      'x-request-id': randomUUID(),
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      version: 1,
      phone: '13800138000',
      businessHours: '09:00-21:00',
    }),
  });
  assert.equal(commercialOk.status, 200);

  const commercialDenied = await fetch(`${base}/api/v1/management/stores/${storeB}/commercial`, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${managerToken}`,
      'x-tenant-context': tenantId,
      'x-request-id': randomUUID(),
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      version: 1,
      phone: '13800138001',
      businessHours: '10:00-22:00',
    }),
  });
  assert.equal(commercialDenied.status, 403);

  const assignDenied = await fetch(`${base}/api/v1/management/stores/${storeA}/manager`, {
    method: 'PATCH',
    headers: {
      authorization: `Bearer ${managerToken}`,
      'x-tenant-context': tenantId,
      'x-request-id': randomUUID(),
      'content-type': 'application/json',
    },
    body: JSON.stringify({ employeeId: staffEmployeeId, version: 2 }),
  });
  assert.equal(assignDenied.status, 403);

  const redeemOk = await fetch(`${base}/api/v1/employee/memberships/redeem`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${managerToken}`,
      'x-tenant-context': tenantId,
      'x-request-id': randomUUID(),
      'idempotency-key': randomUUID(),
      'content-type': 'application/json',
    },
    body: JSON.stringify({ memberCode: memberCodeA, benefitId: benefitA }),
  });
  assert.equal(redeemOk.status, 201);

  const redeemDenied = await fetch(`${base}/api/v1/employee/memberships/redeem`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${managerToken}`,
      'x-tenant-context': tenantId,
      'x-request-id': randomUUID(),
      'idempotency-key': randomUUID(),
      'content-type': 'application/json',
    },
    body: JSON.stringify({ memberCode: memberCodeB, benefitId: benefitB }),
  });
  assert.equal(redeemDenied.status, 403);

  const employeeRedeem = await fetch(`${base}/api/v1/employee/memberships/redeem`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${employeeToken}`,
      'x-tenant-context': tenantId,
      'x-request-id': randomUUID(),
      'idempotency-key': randomUUID(),
      'content-type': 'application/json',
    },
    body: JSON.stringify({ memberCode: memberCodeB, benefitId: benefitB }),
  });
  assert.equal(employeeRedeem.status, 201);

  const managementMenu = await fetch(`${base}/api/v1/me/menu?product=management`, {
    headers: {
      authorization: `Bearer ${managerToken}`,
      'x-tenant-context': tenantId,
      'x-request-id': randomUUID(),
    },
  });
  assert.equal(managementMenu.status, 200);
  const managementData = (await managementMenu.json()).data;
  assert.equal(managementData.homeHref, '/m/stores');
  assert.deepEqual(
    managementData.items.map((item) => item.key),
    ['overview', 'stores'],
  );
});
