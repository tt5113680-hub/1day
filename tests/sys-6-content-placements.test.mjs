/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const base = 'http://127.0.0.1:3270';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3270',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'sys-6-content-placements',
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

test('SYS-6: store managers may place content only on scoped stores', async () => {
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
  const contentId = randomUUID();
  const draftId = randomUUID();
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(
      "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [tenantId, `sys6-content-${stamp}`, `SYS6 Content ${stamp}`],
    );
    for (const [id, email, name] of [
      [ownerId, `owner-content-${stamp}@example.local`, 'Owner'],
      [managerId, `manager-content-${stamp}@example.local`, 'Manager'],
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
      "insert into content_items(id,tenant_id,kind,title,body,status,created_by,updated_by) values($1,$2,'article',$3,'body','approved',null,null),($4,$2,'article',$5,'draft','draft',null,null)",
      [
        contentId,
        tenantId,
        `Approved ${stamp}`,
        draftId,
        `Draft ${stamp}`,
      ],
    );
    await client.query(
      "insert into content_store_placements(id,tenant_id,content_id,store_id,rank,status,created_by,updated_by) values($1,$2,$3,$4,1,'active',null,null)",
      [randomUUID(), tenantId, contentId, storeB],
    );
  } finally {
    await client.end();
  }

  const managerToken = await login(
    `manager-content-${stamp}@example.local`,
    'ChangeMe123!',
    tenantId,
  );

  const list = await fetch(`${base}/api/v1/management/content`, {
    headers: {
      authorization: `Bearer ${managerToken}`,
      'x-tenant-context': tenantId,
      'x-request-id': randomUUID(),
    },
  });
  assert.equal(list.status, 200);
  const listed = await list.json();
  assert.equal(listed.data.length, 1);
  assert.equal(listed.data[0].id, contentId);
  assert.deepEqual(listed.data[0].placements, []);

  const placeOk = await fetch(`${base}/api/v1/management/content/${contentId}/placements`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${managerToken}`,
      'x-tenant-context': tenantId,
      'x-request-id': randomUUID(),
      'content-type': 'application/json',
    },
    body: JSON.stringify({ storeId: storeA, rank: 2 }),
  });
  assert.equal(placeOk.status, 201);

  const placeDenied = await fetch(`${base}/api/v1/management/content/${contentId}/placements`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${managerToken}`,
      'x-tenant-context': tenantId,
      'x-request-id': randomUUID(),
      'content-type': 'application/json',
    },
    body: JSON.stringify({ storeId: storeB, rank: 3 }),
  });
  assert.equal(placeDenied.status, 403);

  const approveDenied = await fetch(`${base}/api/v1/management/content/${draftId}/approve`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${managerToken}`,
      'x-tenant-context': tenantId,
      'x-request-id': randomUUID(),
      'content-type': 'application/json',
    },
    body: JSON.stringify({ version: 1 }),
  });
  assert.equal(approveDenied.status, 403);

  const createDenied = await fetch(`${base}/api/v1/management/content`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${managerToken}`,
      'x-tenant-context': tenantId,
      'x-request-id': randomUUID(),
      'idempotency-key': randomUUID(),
      'content-type': 'application/json',
    },
    body: JSON.stringify({ kind: 'article', title: 'Nope' }),
  });
  assert.equal(createDenied.status, 403);

  const listedAfter = await fetch(`${base}/api/v1/management/content`, {
    headers: {
      authorization: `Bearer ${managerToken}`,
      'x-tenant-context': tenantId,
      'x-request-id': randomUUID(),
    },
  });
  assert.equal(listedAfter.status, 200);
  const after = (await listedAfter.json()).data[0];
  assert.equal(after.placements.length, 1);
  assert.equal(after.placements[0].storeId, storeA);
});
