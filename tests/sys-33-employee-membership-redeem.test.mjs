/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { Client } from '../apps/api/node_modules/pg/esm/index.mjs';
import { STORE_MANAGER_PACKAGE_ACTIONS } from '../packages/contracts/dist/index.js';

const apiBase = 'http://127.0.0.1:3355';
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3355',
    DATABASE_URL: db,
    AUTH_TOKEN_SECRET: 'sys-33-employee-membership-redeem',
  },
  stdio: 'ignore',
});

async function ready() {
  for (let i = 0; i < 40; i += 1) {
    try {
      if ((await fetch(`${apiBase}/api/v1/health`)).ok) return;
    } catch {
      /* waiting */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw Error('API did not start');
}

async function seedEmployee() {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const tenantId = randomUUID();
  const userId = randomUUID();
  const membershipId = randomUUID();
  const roleId = randomUUID();
  const orgId = randomUUID();
  const employeeId = randomUUID();
  const email = `sys33-emp-${stamp}@example.local`;
  const client = new Client({ connectionString: db });
  await client.connect();
  try {
    await client.query(
      "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [tenantId, `sys33-${stamp}`, `SYS33 ${stamp}`],
    );
    await client.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
      [userId, email, 'SYS33 Employee'],
    );
    await client.query(
      "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [membershipId, tenantId, userId],
    );
    await client.query(
      "insert into roles(id,tenant_id,code,name,status,created_by,updated_by) values($1,$2,'employee','Employee','active',null,null)",
      [roleId, tenantId],
    );
    await client.query(
      'insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,$4)',
      [randomUUID(), tenantId, membershipId, roleId],
    );
    const taskRead = await client.query("select id from permissions where code='task.read' limit 1");
    const taskManage = await client.query(
      "select id from permissions where code='task.manage' limit 1",
    );
    for (const permissionId of [taskRead.rows[0].id, taskManage.rows[0].id]) {
      await client.query(
        "insert into role_permissions(id,tenant_id,role_id,permission_id,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null)",
        [randomUUID(), tenantId, roleId, permissionId],
      );
    }
    await client.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,$4,'merchant','active',null,null)",
      [orgId, tenantId, `ORG33-${stamp}`, `Org33 ${stamp}`],
    );
    await client.query(
      "insert into employees(id,tenant_id,membership_id,organization_id,employee_code,title,status,created_by,updated_by) values($1,$2,$3,$4,$5,'Staff','active',null,null)",
      [employeeId, tenantId, membershipId, orgId, `E33-${stamp}`],
    );
  } finally {
    await client.end();
  }
  return { email, tenantId };
}

test.after(() => api.kill());

test('SYS-33 memberships route package link and benefits API', async () => {
  assert.equal(
    STORE_MANAGER_PACKAGE_ACTIONS.find((item) => item.key === 'redeem')?.href,
    '/e/memberships',
  );

  await ready();
  const seeded = await seedEmployee();
  const login = await fetch(`${apiBase}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: seeded.email,
      password: 'ChangeMe123!',
      tenantId: seeded.tenantId,
    }),
  });
  assert.equal(login.status, 201);
  const token = (await login.json()).accessToken;
  const benefits = await fetch(`${apiBase}/api/v1/employee/memberships/benefits`, {
    headers: {
      authorization: `Bearer ${token}`,
      'x-request-id': randomUUID(),
    },
  });
  assert.equal(benefits.status, 200);
  assert.ok(Array.isArray((await benefits.json()).data));
});
