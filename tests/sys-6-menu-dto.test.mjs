/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';
import {
  CHANNEL_MENU_CATALOG,
  CIRCLE_MENU_CATALOG,
  EMPLOYEE_MENU_CATALOG,
  MANAGEMENT_MENU_CATALOG,
  PLATFORM_MENU_CATALOG,
  filterMenuCatalog,
} from '../packages/contracts/dist/index.js';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const base = 'http://127.0.0.1:3266';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3266',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'sys-6-menu-dto',
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

test('SYS-6: /me/menu filters Management items by permission set', async () => {
  await ready();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const tenantId = randomUUID();
  const ownerId = randomUUID();
  const readerId = randomUUID();
  const ownerRoleId = randomUUID();
  const readerRoleId = randomUUID();
  const ownerMembershipId = randomUUID();
  const readerMembershipId = randomUUID();
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(
      "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [tenantId, `sys6-menu-${stamp}`, `SYS6 Menu ${stamp}`],
    );
    await client.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
      [ownerId, `owner-sys6-${stamp}@example.local`, 'SYS6 Owner'],
    );
    await client.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
      [readerId, `reader-sys6-${stamp}@example.local`, 'SYS6 Reader'],
    );
    await client.query(
      "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null),($4,$2,$5,'active',null,null)",
      [ownerMembershipId, tenantId, ownerId, readerMembershipId, readerId],
    );
    await client.query(
      "insert into roles(id,tenant_id,code,name,status,created_by,updated_by) values($1,$2,'owner','Owner','active',null,null),($3,$2,'reader','Reader','active',null,null)",
      [ownerRoleId, tenantId, readerRoleId],
    );
    await client.query(
      'insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,$4),($5,$2,$6,$7)',
      [
        randomUUID(),
        tenantId,
        ownerMembershipId,
        ownerRoleId,
        randomUUID(),
        readerMembershipId,
        readerRoleId,
      ],
    );
    const tenantManage = await client.query(
      "select id from permissions where code='tenant.manage' limit 1",
    );
    const customerRead = await client.query(
      "select id from permissions where code='customer.read' limit 1",
    );
    assert.ok(tenantManage.rows[0]?.id);
    assert.ok(customerRead.rows[0]?.id);
    await client.query(
      "insert into role_permissions(id,tenant_id,role_id,permission_id,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null),($5,$2,$6,$7,'active',null,null)",
      [
        randomUUID(),
        tenantId,
        ownerRoleId,
        tenantManage.rows[0].id,
        randomUUID(),
        readerRoleId,
        customerRead.rows[0].id,
      ],
    );
  } finally {
    await client.end();
  }

  const ownerToken = await login(`owner-sys6-${stamp}@example.local`, 'ChangeMe123!', tenantId);
  const readerToken = await login(`reader-sys6-${stamp}@example.local`, 'ChangeMe123!', tenantId);

  const ownerMenu = await fetch(`${base}/api/v1/me/menu?product=management`, {
    headers: {
      authorization: `Bearer ${ownerToken}`,
      'x-tenant-context': tenantId,
      'x-request-id': randomUUID(),
    },
  });
  assert.equal(ownerMenu.status, 200);
  const ownerData = (await ownerMenu.json()).data;
  assert.equal(ownerData.product, 'management');
  assert.ok(ownerData.roleCodes.includes('owner'));
  assert.equal(ownerData.homeHref, '/');
  assert.ok(Array.isArray(ownerData.scopes));
  assert.ok(Array.isArray(ownerData.availableProducts));
  assert.deepEqual(
    ownerData.items.map((item) => item.key),
    filterMenuCatalog(MANAGEMENT_MENU_CATALOG, ['tenant.manage']).map((item) => item.key),
  );
  assert.ok(!ownerData.items.some((item) => item.key === 'roles' || item.key === 'settings'));

  const readerMenu = await fetch(`${base}/api/v1/me/menu?product=management`, {
    headers: {
      authorization: `Bearer ${readerToken}`,
      'x-tenant-context': tenantId,
      'x-request-id': randomUUID(),
    },
  });
  assert.equal(readerMenu.status, 200);
  const readerData = (await readerMenu.json()).data;
  assert.deepEqual(
    readerData.items.map((item) => item.key),
    ['overview'],
  );
  assert.ok(!readerData.items.some((item) => item.key === 'roles'));
});

test('SYS-6: platform/channel/circle/employee menus + store-manager home', async () => {
  await ready();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const tenantId = randomUUID();
  const systemTenant = '00000000-0000-4000-8000-000000000001';
  const platformUserId = randomUUID();
  const managerUserId = randomUUID();
  const platformRoleId = randomUUID();
  const managerRoleId = randomUUID();
  const platformMembershipId = randomUUID();
  const managerMembershipId = randomUUID();
  const orgId = randomUUID();
  const merchantId = randomUUID();
  const employeeId = randomUUID();
  const storeId = randomUUID();
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(
      "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [tenantId, `sys6-roles-${stamp}`, `SYS6 Roles ${stamp}`],
    );
    await client.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
      [platformUserId, `platform-sys6-${stamp}@example.local`, 'SYS6 Platform'],
    );
    await client.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
      [managerUserId, `manager-sys6-${stamp}@example.local`, 'SYS6 Manager'],
    );
    await client.query(
      "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [platformMembershipId, systemTenant, platformUserId],
    );
    await client.query(
      "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [managerMembershipId, tenantId, managerUserId],
    );
    await client.query(
      "insert into roles(id,tenant_id,code,name,status,created_by,updated_by) values($1,$2,$3,'Platform Admin','active',null,null)",
      [platformRoleId, systemTenant, `platform_admin_${stamp}`],
    );
    await client.query(
      "insert into roles(id,tenant_id,code,name,status,created_by,updated_by) values($1,$2,$3,'Store Manager','active',null,null)",
      [managerRoleId, tenantId, `store_manager_${stamp}`],
    );
    await client.query(
      'insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,$4)',
      [randomUUID(), systemTenant, platformMembershipId, platformRoleId],
    );
    await client.query(
      'insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,$4)',
      [randomUUID(), tenantId, managerMembershipId, managerRoleId],
    );
    const platformRead = await client.query(
      "select id from permissions where code='platform.read' limit 1",
    );
    const platformManage = await client.query(
      "select id from permissions where code='platform.manage' limit 1",
    );
    const circleManage = await client.query(
      "select id from permissions where code='circle.manage' limit 1",
    );
    const taskRead = await client.query(
      "select id from permissions where code='task.read' limit 1",
    );
    const customerRead = await client.query(
      "select id from permissions where code='customer.read' limit 1",
    );
    assert.ok(platformRead.rows[0]?.id);
    assert.ok(platformManage.rows[0]?.id);
    assert.ok(circleManage.rows[0]?.id);
    assert.ok(taskRead.rows[0]?.id);
    assert.ok(customerRead.rows[0]?.id);
    for (const permissionId of [
      platformRead.rows[0].id,
      platformManage.rows[0].id,
      circleManage.rows[0].id,
    ]) {
      await client.query(
        "insert into role_permissions(id,tenant_id,role_id,permission_id,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null)",
        [randomUUID(), systemTenant, platformRoleId, permissionId],
      );
    }
    for (const permissionId of [taskRead.rows[0].id, customerRead.rows[0].id]) {
      await client.query(
        "insert into role_permissions(id,tenant_id,role_id,permission_id,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null)",
        [randomUUID(), tenantId, managerRoleId, permissionId],
      );
    }
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
      [employeeId, tenantId, managerMembershipId, orgId, `E-${stamp}`],
    );
    await client.query(
      "insert into stores(id,tenant_id,organization_id,merchant_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,$5,$6,'active',null,null)",
      [storeId, tenantId, orgId, merchantId, `S-${stamp}`, `Store ${stamp}`],
    );
    await client.query(
      "insert into store_managers(id,tenant_id,store_id,employee_id,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null)",
      [randomUUID(), tenantId, storeId, employeeId],
    );
  } finally {
    await client.end();
  }

  const platformToken = await login(
    `platform-sys6-${stamp}@example.local`,
    'ChangeMe123!',
    systemTenant,
  );
  const managerToken = await login(`manager-sys6-${stamp}@example.local`, 'ChangeMe123!', tenantId);

  for (const [product, catalog, permissions] of [
    ['platform', PLATFORM_MENU_CATALOG, ['platform.read', 'platform.manage', 'circle.manage']],
    ['channel', CHANNEL_MENU_CATALOG, ['platform.read', 'platform.manage', 'circle.manage']],
    ['circle', CIRCLE_MENU_CATALOG, ['platform.read', 'platform.manage', 'circle.manage']],
  ]) {
    const response = await fetch(`${base}/api/v1/me/menu?product=${product}`, {
      headers: {
        authorization: `Bearer ${platformToken}`,
        'x-tenant-context': systemTenant,
        'x-request-id': randomUUID(),
      },
    });
    assert.equal(response.status, 200);
    const data = (await response.json()).data;
    assert.equal(data.product, product);
    assert.deepEqual(
      data.items.map((item) => item.key),
      filterMenuCatalog(catalog, permissions).map((item) => item.key),
    );
    assert.ok(data.homeHref);
    assert.ok(data.availableProducts.some((item) => item.product === 'platform'));
    assert.ok(data.availableProducts.some((item) => item.product === 'channel'));
    assert.ok(data.availableProducts.some((item) => item.product === 'circle'));
  }

  const employeeMenu = await fetch(`${base}/api/v1/me/menu?product=employee`, {
    headers: {
      authorization: `Bearer ${managerToken}`,
      'x-tenant-context': tenantId,
      'x-request-id': randomUUID(),
    },
  });
  assert.equal(employeeMenu.status, 200);
  const employeeData = (await employeeMenu.json()).data;
  assert.equal(employeeData.product, 'employee');
  assert.equal(employeeData.homeHref, '/e/store');
  assert.ok(employeeData.roleCodes.includes(`store_manager_${stamp}`));
  assert.ok(employeeData.items.some((item) => item.key === 'store'));
  assert.ok(employeeData.scopes.some((scope) => scope.type === 'store' && scope.id === storeId));
  assert.deepEqual(
    employeeData.items.filter((item) => item.key !== 'store').map((item) => item.key),
    filterMenuCatalog(EMPLOYEE_MENU_CATALOG, ['task.read', 'customer.read']).map(
      (item) => item.key,
    ),
  );
});
