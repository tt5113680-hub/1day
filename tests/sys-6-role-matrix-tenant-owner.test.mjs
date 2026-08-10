/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';
import { MANAGEMENT_MENU_CATALOG, filterMenuCatalog } from '../packages/contracts/dist/index.js';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const base = 'http://127.0.0.1:3277';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3277',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'sys-6-role-matrix-tenant-owner',
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

test('SYS-6 Role matrix E2E slice: Tenant Manager vs Owner chrome', async () => {
  await ready();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const tenantId = randomUUID();
  const ownerId = randomUUID();
  const managerId = randomUUID();
  const ownerRoleId = randomUUID();
  const managerRoleId = randomUUID();
  const ownerMembershipId = randomUUID();
  const managerMembershipId = randomUUID();
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(
      "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [tenantId, `sys6-rm-to-${stamp}`, `SYS6 RM TO ${stamp}`],
    );
    for (const [id, email, name] of [
      [ownerId, `owner-to-${stamp}@example.local`, 'Owner'],
      [managerId, `manager-to-${stamp}@example.local`, 'Tenant Manager'],
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
      "insert into roles(id,tenant_id,code,name,status,created_by,updated_by) values($1,$2,$3,'Owner','active',null,null),($4,$2,$5,'Tenant Manager','active',null,null)",
      [ownerRoleId, tenantId, `owner_${stamp}`, managerRoleId, `tenant_manager_${stamp}`],
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
    const codes = {};
    for (const code of [
      'tenant.manage',
      'organization.manage',
      'customer.manage',
      'employee.manage',
      'workflow.manage',
      'workflow.read',
      'page.manage',
    ]) {
      codes[code] = (await client.query('select id from permissions where code=$1 limit 1', [code]))
        .rows[0].id;
    }
    for (const code of Object.keys(codes)) {
      await client.query(
        "insert into role_permissions(id,tenant_id,role_id,permission_id,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null)",
        [randomUUID(), tenantId, ownerRoleId, codes[code]],
      );
    }
    for (const code of [
      'tenant.manage',
      'customer.manage',
      'employee.manage',
      'workflow.manage',
      'workflow.read',
      'page.manage',
    ]) {
      await client.query(
        "insert into role_permissions(id,tenant_id,role_id,permission_id,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null)",
        [randomUUID(), tenantId, managerRoleId, codes[code]],
      );
    }
  } finally {
    await client.end();
  }

  const ownerToken = await login(`owner-to-${stamp}@example.local`, 'ChangeMe123!', tenantId);
  const managerToken = await login(`manager-to-${stamp}@example.local`, 'ChangeMe123!', tenantId);
  const headers = (token) => ({
    authorization: `Bearer ${token}`,
    'x-tenant-context': tenantId,
    'x-request-id': randomUUID(),
    'content-type': 'application/json',
  });

  const ownerMenu = await fetch(`${base}/api/v1/me/menu?product=management`, {
    headers: headers(ownerToken),
  });
  assert.equal(ownerMenu.status, 200);
  const ownerItems = (await ownerMenu.json()).data.items.map((item) => item.key);
  assert.deepEqual(
    ownerItems,
    filterMenuCatalog(MANAGEMENT_MENU_CATALOG, [
      'tenant.manage',
      'organization.manage',
      'customer.manage',
      'employee.manage',
      'workflow.manage',
      'workflow.read',
      'page.manage',
    ]).map((item) => item.key),
  );
  assert.ok(ownerItems.includes('roles'));
  assert.ok(ownerItems.includes('settings'));

  const managerMenu = await fetch(`${base}/api/v1/me/menu?product=management`, {
    headers: headers(managerToken),
  });
  assert.equal(managerMenu.status, 200);
  const managerItems = (await managerMenu.json()).data.items.map((item) => item.key);
  assert.deepEqual(
    managerItems,
    filterMenuCatalog(MANAGEMENT_MENU_CATALOG, [
      'tenant.manage',
      'customer.manage',
      'employee.manage',
      'workflow.manage',
      'workflow.read',
      'page.manage',
    ]).map((item) => item.key),
  );
  assert.ok(!managerItems.includes('roles'));
  assert.ok(!managerItems.includes('settings'));
  assert.ok(managerItems.includes('organization'));
  assert.ok(managerItems.includes('workflows'));

  assert.equal(
    (
      await fetch(`${base}/api/v1/management/roles-permissions`, {
        headers: headers(managerToken),
      })
    ).status,
    403,
  );
  assert.equal(
    (await fetch(`${base}/api/v1/management/settings`, { headers: headers(managerToken) })).status,
    403,
  );
  assert.equal(
    (
      await fetch(`${base}/api/v1/rbac/roles`, {
        method: 'POST',
        headers: { ...headers(managerToken), 'idempotency-key': randomUUID() },
        body: JSON.stringify({ code: `deny_${stamp}`, name: 'Denied' }),
      })
    ).status,
    403,
  );

  assert.equal(
    (
      await fetch(`${base}/api/v1/management/roles-permissions`, {
        headers: headers(ownerToken),
      })
    ).status,
    200,
  );
  assert.equal(
    (await fetch(`${base}/api/v1/management/settings`, { headers: headers(ownerToken) })).status,
    200,
  );
  const created = await fetch(`${base}/api/v1/rbac/roles`, {
    method: 'POST',
    headers: { ...headers(ownerToken), 'idempotency-key': randomUUID() },
    body: JSON.stringify({ code: `owner_pack_${stamp}`, name: `Owner Pack ${stamp}` }),
  });
  assert.equal(created.status, 201);
});
