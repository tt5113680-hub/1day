/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const base = 'http://127.0.0.1:3267';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3267',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'sys-6-data-scopes',
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

test('SYS-6: data_scopes sync on manager assign + access gate', async () => {
  await ready();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const tenantId = randomUUID();
  const ownerId = randomUUID();
  const managerId = randomUUID();
  const strangerId = randomUUID();
  const ownerRoleId = randomUUID();
  const managerRoleId = randomUUID();
  const strangerRoleId = randomUUID();
  const ownerMembershipId = randomUUID();
  const managerMembershipId = randomUUID();
  const strangerMembershipId = randomUUID();
  const orgId = randomUUID();
  const merchantId = randomUUID();
  const employeeId = randomUUID();
  const strangerEmployeeId = randomUUID();
  const storeId = randomUUID();
  const otherStoreId = randomUUID();
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(
      "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [tenantId, `sys6-scope-${stamp}`, `SYS6 Scope ${stamp}`],
    );
    for (const [id, email, name] of [
      [ownerId, `owner-scope-${stamp}@example.local`, 'Owner'],
      [managerId, `manager-scope-${stamp}@example.local`, 'Manager'],
      [strangerId, `stranger-scope-${stamp}@example.local`, 'Stranger'],
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
        strangerMembershipId,
        strangerId,
      ],
    );
    await client.query(
      "insert into roles(id,tenant_id,code,name,status,created_by,updated_by) values($1,$2,'owner','Owner','active',null,null),($3,$2,'store_manager','Store Manager','active',null,null),($4,$2,'employee','Employee','active',null,null)",
      [ownerRoleId, tenantId, managerRoleId, strangerRoleId],
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
        strangerMembershipId,
        strangerRoleId,
      ],
    );
    const tenantManage = await client.query(
      "select id from permissions where code='tenant.manage' limit 1",
    );
    const taskRead = await client.query("select id from permissions where code='task.read' limit 1");
    const customerRead = await client.query(
      "select id from permissions where code='customer.read' limit 1",
    );
    assert.ok(tenantManage.rows[0]?.id);
    assert.ok(taskRead.rows[0]?.id);
    assert.ok(customerRead.rows[0]?.id);
    await client.query(
      "insert into role_permissions(id,tenant_id,role_id,permission_id,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null)",
      [randomUUID(), tenantId, ownerRoleId, tenantManage.rows[0].id],
    );
    await client.query(
      "insert into role_permissions(id,tenant_id,role_id,permission_id,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null),($5,$2,$3,$6,'active',null,null)",
      [
        randomUUID(),
        tenantId,
        managerRoleId,
        taskRead.rows[0].id,
        randomUUID(),
        customerRead.rows[0].id,
      ],
    );
    await client.query(
      "insert into role_permissions(id,tenant_id,role_id,permission_id,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null)",
      [randomUUID(), tenantId, strangerRoleId, taskRead.rows[0].id],
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
      "insert into employees(id,tenant_id,membership_id,organization_id,employee_code,title,status,created_by,updated_by) values($1,$2,$3,$4,$5,'Store Manager','active',null,null),($6,$2,$7,$4,$8,'Employee','active',null,null)",
      [
        employeeId,
        tenantId,
        managerMembershipId,
        orgId,
        `E-${stamp}`,
        strangerEmployeeId,
        strangerMembershipId,
        `S-${stamp}`,
      ],
    );
    await client.query(
      "insert into stores(id,tenant_id,organization_id,merchant_id,code,name,status,version,created_by,updated_by) values($1,$2,$3,$4,$5,$6,'active',1,null,null),($7,$2,$3,$4,$8,$9,'active',1,null,null)",
      [
        storeId,
        tenantId,
        orgId,
        merchantId,
        `ST-${stamp}`,
        `Store ${stamp}`,
        otherStoreId,
        `OT-${stamp}`,
        `Other ${stamp}`,
      ],
    );
  } finally {
    await client.end();
  }

  const ownerToken = await login(`owner-scope-${stamp}@example.local`, 'ChangeMe123!', tenantId);
  const managerToken = await login(
    `manager-scope-${stamp}@example.local`,
    'ChangeMe123!',
    tenantId,
  );
  const strangerToken = await login(
    `stranger-scope-${stamp}@example.local`,
    'ChangeMe123!',
    tenantId,
  );

  const assign = await fetch(`${base}/api/v1/management/stores/${storeId}/manager`, {
    method: 'PATCH',
    headers: {
      authorization: `Bearer ${ownerToken}`,
      'x-tenant-context': tenantId,
      'x-request-id': randomUUID(),
      'content-type': 'application/json',
    },
    body: JSON.stringify({ employeeId, version: 1 }),
  });
  assert.equal(assign.status, 200);

  const verify = new Client({ connectionString: databaseUrl });
  await verify.connect();
  try {
    const scopes = await verify.query(
      "select scope_type, scope_value, status from data_scopes where tenant_id=$1 and membership_id=$2 and scope_type='store'",
      [tenantId, managerMembershipId],
    );
    assert.equal(scopes.rowCount, 1);
    assert.equal(scopes.rows[0].scope_value, storeId);
    assert.equal(scopes.rows[0].status, 'active');
  } finally {
    await verify.end();
  }

  const managed = await fetch(`${base}/api/v1/employee/managed-stores`, {
    headers: {
      authorization: `Bearer ${managerToken}`,
      'x-tenant-context': tenantId,
      'x-request-id': randomUUID(),
    },
  });
  assert.equal(managed.status, 200);
  const managedData = (await managed.json()).data;
  assert.deepEqual(
    managedData.stores.map((store) => store.id),
    [storeId],
  );

  const allowed = await fetch(`${base}/api/v1/employee/managed-stores/${storeId}/access`, {
    headers: {
      authorization: `Bearer ${managerToken}`,
      'x-tenant-context': tenantId,
      'x-request-id': randomUUID(),
    },
  });
  assert.equal(allowed.status, 200);

  const deniedOther = await fetch(
    `${base}/api/v1/employee/managed-stores/${otherStoreId}/access`,
    {
      headers: {
        authorization: `Bearer ${managerToken}`,
        'x-tenant-context': tenantId,
        'x-request-id': randomUUID(),
      },
    },
  );
  assert.equal(deniedOther.status, 403);

  const deniedStranger = await fetch(`${base}/api/v1/employee/managed-stores/${storeId}/access`, {
    headers: {
      authorization: `Bearer ${strangerToken}`,
      'x-tenant-context': tenantId,
      'x-request-id': randomUUID(),
    },
  });
  assert.equal(deniedStranger.status, 403);

  const menu = await fetch(`${base}/api/v1/me/menu?product=employee`, {
    headers: {
      authorization: `Bearer ${managerToken}`,
      'x-tenant-context': tenantId,
      'x-request-id': randomUUID(),
    },
  });
  assert.equal(menu.status, 200);
  const menuData = (await menu.json()).data;
  assert.ok(menuData.scopes.some((scope) => scope.type === 'store' && scope.id === storeId));
  assert.ok(menuData.items.some((item) => item.key === 'store'));
});
