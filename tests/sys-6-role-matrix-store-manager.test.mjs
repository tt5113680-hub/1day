/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const base = 'http://127.0.0.1:3276';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3276',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'sys-6-role-matrix-store-manager',
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

test('SYS-6 Role matrix E2E slice: Store Manager package (menu+scope+writes+denials)', async () => {
  await ready();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const tenantId = randomUUID();
  const managerId = randomUUID();
  const managerRoleId = randomUUID();
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
  const contentId = randomUUID();
  const draftId = randomUUID();
  const actionA = randomUUID();
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(
      "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [tenantId, `sys6-rm-sm-${stamp}`, `SYS6 RM SM ${stamp}`],
    );
    await client.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
      [managerId, `manager-rm-${stamp}@example.local`, 'Store Manager'],
    );
    await client.query(
      "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [managerMembershipId, tenantId, managerId],
    );
    await client.query(
      "insert into roles(id,tenant_id,code,name,status,created_by,updated_by) values($1,$2,$3,'Store Manager','active',null,null)",
      [managerRoleId, tenantId, `store_manager_${stamp}`],
    );
    await client.query(
      'insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,$4)',
      [randomUUID(), tenantId, managerMembershipId, managerRoleId],
    );
    const permissionIds = {};
    for (const code of ['tenant.read', 'task.read', 'customer.read']) {
      permissionIds[code] = (
        await client.query('select id from permissions where code=$1 limit 1', [code])
      ).rows[0].id;
    }
    for (const code of Object.keys(permissionIds)) {
      await client.query(
        "insert into role_permissions(id,tenant_id,role_id,permission_id,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null)",
        [randomUUID(), tenantId, managerRoleId, permissionIds[code]],
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
    await client.query(
      "insert into content_items(id,tenant_id,kind,title,body,status,created_by,updated_by) values($1,$2,'article',$3,'body','approved',null,null),($4,$2,'article',$5,'draft','draft',null,null)",
      [contentId, tenantId, `Approved ${stamp}`, draftId, `Draft ${stamp}`],
    );
    await client.query(
      "insert into external_actions(id,tenant_id,code,name,action_type,platform,target_url,status,created_by,updated_by) values($1,$2,$3,$4,'link','meituan',$5,'active',null,null)",
      [actionA, tenantId, `A-LINK-${stamp}`, `Link A ${stamp}`, 'https://example.com/a'],
    );
    await client.query(
      "insert into store_external_actions(id,tenant_id,store_id,external_action_id,enabled,sort_order,created_by,updated_by) values($1,$2,$3,$4,true,1,null,null)",
      [randomUUID(), tenantId, storeA, actionA],
    );
  } finally {
    await client.end();
  }

  const token = await login(`manager-rm-${stamp}@example.local`, 'ChangeMe123!', tenantId);
  const headers = (extra = {}) => ({
    authorization: `Bearer ${token}`,
    'x-tenant-context': tenantId,
    'x-request-id': randomUUID(),
    'content-type': 'application/json',
    ...extra,
  });

  // 1) Server menu: Management store-manager chrome (no owner-only entries)
  const managementMenu = await fetch(`${base}/api/v1/me/menu?product=management`, {
    headers: headers(),
  });
  assert.equal(managementMenu.status, 200);
  const management = (await managementMenu.json()).data;
  assert.deepEqual(management.items.map((item) => item.key), [
    'overview',
    'stores',
    'offers',
    'memberships',
    'content',
  ]);
  assert.ok(!management.items.some((item) => ['roles', 'settings', 'workflows', 'organization', 'customers', 'page-builder'].includes(item.key)));
  assert.ok(management.scopes.some((scope) => scope.type === 'store' && scope.id === storeA));
  assert.ok(!management.scopes.some((scope) => scope.id === storeB));

  // 2) Employee shell: Store Manager store tab + home
  const employeeMenu = await fetch(`${base}/api/v1/me/menu?product=employee`, {
    headers: headers(),
  });
  assert.equal(employeeMenu.status, 200);
  const employee = (await employeeMenu.json()).data;
  assert.equal(employee.homeHref, '/e/store');
  assert.ok(employee.items.some((item) => item.key === 'store'));
  assert.ok(employee.scopes.some((scope) => scope.type === 'store' && scope.id === storeA));

  const managedStores = await fetch(`${base}/api/v1/employee/managed-stores`, {
    headers: headers(),
  });
  assert.equal(managedStores.status, 200);
  assert.deepEqual(
    (await managedStores.json()).data.stores.map((row) => row.id),
    [storeA],
  );

  // 3) Scoped writes allowed on store A
  const catalogCreate = await fetch(
    `${base}/api/v1/management/catalog/stores/${storeA}/services`,
    {
      method: 'POST',
      headers: headers({ 'idempotency-key': randomUUID() }),
      body: JSON.stringify({
        code: `A-SVC-${stamp}`,
        name: `Service A ${stamp}`,
        rank: 1,
      }),
    },
  );
  assert.equal(catalogCreate.status, 201);
  const serviceA = (await catalogCreate.json()).data;

  const offerCreate = await fetch(
    `${base}/api/v1/management/catalog/services/${serviceA.id}/offers`,
    {
      method: 'POST',
      headers: headers({ 'idempotency-key': randomUUID() }),
      body: JSON.stringify({
        externalActionId: actionA,
        offerPrice: 88,
        marketPrice: 99,
        priceSource: '店长登记',
        sourceUpdatedAt: new Date().toISOString(),
        sortOrder: 0,
      }),
    },
  );
  assert.equal(offerCreate.status, 201);

  const grantOk = await fetch(`${base}/api/v1/management/memberships/${enrollmentA}/grants`, {
    method: 'POST',
    headers: headers({ 'idempotency-key': randomUUID() }),
    body: JSON.stringify({ benefitId: benefitA, quantity: 1 }),
  });
  assert.equal(grantOk.status, 201);

  const placeOk = await fetch(`${base}/api/v1/management/content/${contentId}/placements`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ storeId: storeA, rank: 1 }),
  });
  assert.equal(placeOk.status, 201);

  // 4) Cross-scope + owner-only denials
  assert.equal(
    (
      await fetch(`${base}/api/v1/management/catalog/stores/${storeB}/services`, {
        method: 'POST',
        headers: headers({ 'idempotency-key': randomUUID() }),
        body: JSON.stringify({ code: `B-${stamp}`, name: 'Denied', rank: 1 }),
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(`${base}/api/v1/management/memberships/${enrollmentB}/grants`, {
        method: 'POST',
        headers: headers({ 'idempotency-key': randomUUID() }),
        body: JSON.stringify({ benefitId: benefitB, quantity: 1 }),
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(`${base}/api/v1/management/content/${contentId}/placements`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ storeId: storeB, rank: 2 }),
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(`${base}/api/v1/management/content`, {
        method: 'POST',
        headers: headers({ 'idempotency-key': randomUUID() }),
        body: JSON.stringify({ kind: 'article', title: 'Nope' }),
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(`${base}/api/v1/management/content/${draftId}/approve`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ version: 1 }),
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(`${base}/api/v1/organizations`, {
        method: 'POST',
        headers: headers({ 'idempotency-key': randomUUID() }),
        body: JSON.stringify({
          code: `DENY-${stamp}`,
          name: 'Denied Org',
          organizationType: 'team',
        }),
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(`${base}/api/v1/rbac/roles`, {
        method: 'POST',
        headers: headers({ 'idempotency-key': randomUUID() }),
        body: JSON.stringify({ code: `deny_${stamp}`, name: 'Denied Role' }),
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(`${base}/api/v1/workflows`, {
        method: 'POST',
        headers: headers({ 'idempotency-key': randomUUID() }),
        body: JSON.stringify({
          code: `deny-wf-${stamp}`,
          name: 'Denied WF',
          steps: [
            {
              name: 'Approve',
              type: 'approval',
              assigneeEmployeeId: managerEmployeeId,
              timeoutMinutes: 60,
            },
          ],
        }),
      })
    ).status,
    403,
  );
});
