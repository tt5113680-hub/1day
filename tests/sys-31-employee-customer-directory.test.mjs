import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';
import { EMPLOYEE_MENU_CATALOG } from '../packages/contracts/dist/index.js';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const base = 'http://127.0.0.1:3350';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3350',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'sys-31-employee-customer-directory',
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

test.after(() => api.kill());

test('SYS-31: Employee 客户 menu points to /e/customers', () => {
  assert.equal(EMPLOYEE_MENU_CATALOG.find((item) => item.key === 'customers')?.href, '/e/customers');
});

test('SYS-31: employee customers list returns scoped directory only', async () => {
  await ready();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const tenantId = randomUUID();
  const userId = randomUUID();
  const otherUserId = randomUUID();
  const membershipId = randomUUID();
  const otherMembershipId = randomUUID();
  const roleId = randomUUID();
  const otherRoleId = randomUUID();
  const orgId = randomUUID();
  const employeeId = randomUUID();
  const otherEmployeeId = randomUUID();
  const ownedCustomerId = randomUUID();
  const foreignCustomerId = randomUUID();
  const email = `sys31-${stamp}@example.local`;
  const otherEmail = `sys31-other-${stamp}@example.local`;
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(
      "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [tenantId, `sys31-${stamp}`, `SYS31 ${stamp}`],
    );
    for (const [id, mail, name] of [
      [userId, email, 'SYS31 Emp'],
      [otherUserId, otherEmail, 'SYS31 Other'],
    ]) {
      await client.query(
        "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
        [id, mail, name],
      );
    }
    await client.query(
      "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null),($4,$2,$5,'active',null,null)",
      [membershipId, tenantId, userId, otherMembershipId, otherUserId],
    );
    await client.query(
      "insert into roles(id,tenant_id,code,name,status,created_by,updated_by) values($1,$2,'employee','Employee','active',null,null),($3,$2,'employee_b','Employee B','active',null,null)",
      [roleId, tenantId, otherRoleId],
    );
    await client.query(
      'insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,$4),($5,$2,$6,$7)',
      [
        randomUUID(),
        tenantId,
        membershipId,
        roleId,
        randomUUID(),
        otherMembershipId,
        otherRoleId,
      ],
    );
    const customerRead = await client.query(
      "select id from permissions where code='customer.read' limit 1",
    );
    for (const rid of [roleId, otherRoleId]) {
      await client.query(
        "insert into role_permissions(id,tenant_id,role_id,permission_id,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null)",
        [randomUUID(), tenantId, rid, customerRead.rows[0].id],
      );
    }
    await client.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,$4,'merchant','active',null,null)",
      [orgId, tenantId, `ORG-${stamp}`, `Org ${stamp}`],
    );
    await client.query(
      "insert into employees(id,tenant_id,membership_id,organization_id,employee_code,title,status,created_by,updated_by) values($1,$2,$3,$4,$5,'Staff','active',null,null),($6,$2,$7,$4,$8,'Staff B','active',null,null)",
      [employeeId, tenantId, membershipId, orgId, `E-${stamp}`, otherEmployeeId, otherMembershipId, `EB-${stamp}`],
    );
    await client.query(
      "insert into customers(id,tenant_id,display_name,status,created_by,updated_by) values($1,$2,$3,'active',null,null),($4,$2,$5,'active',null,null)",
      [ownedCustomerId, tenantId, `Owned ${stamp}`, foreignCustomerId, `Foreign ${stamp}`],
    );
    await client.query(
      "insert into customer_ownerships(id,tenant_id,customer_id,employee_id,ownership_role,status,created_by,updated_by) values($1,$2,$3,$4,'owner','active',null,null),($5,$2,$6,$7,'owner','active',null,null)",
      [
        randomUUID(),
        tenantId,
        ownedCustomerId,
        employeeId,
        randomUUID(),
        foreignCustomerId,
        otherEmployeeId,
      ],
    );
  } finally {
    await client.end();
  }

  const login = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'ChangeMe123!', tenantId }),
  });
  assert.equal(login.status, 201);
  const token = (await login.json()).accessToken;
  const list = await fetch(`${base}/api/v1/employee/customers`, {
    headers: {
      authorization: `Bearer ${token}`,
      'x-tenant-context': tenantId,
      'x-request-id': randomUUID(),
    },
  });
  assert.equal(list.status, 200);
  const data = (await list.json()).data;
  assert.ok(Array.isArray(data.customers));
  assert.equal(data.customers.length, 1);
  assert.equal(data.customers[0].id, ownedCustomerId);
  assert.equal(data.customers[0].owned, true);
});
