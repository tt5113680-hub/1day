/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';
import { URL } from 'node:url';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const employeeService = () => read('apps/api/src/employee.service.ts');
const managementService = () => read('apps/api/src/management-organization-employee.service.ts');
const page = () => read('apps/management-web/app/m/organization-employees/page.tsx');
const css = () => read('apps/management-web/app/m/organization-employees/page.module.css');
const migration = () => read('packages/database/src/migrations/069_employee_role_package.ts');

test('G1-W116: migration adds tenant-scoped role + store to invitation for invite→activate role binding', () => {
  const m = migration();
  assert.match(m, /alterTable\('membership_invitations'\)/);
  assert.match(m, /addColumn\('role_id', 'uuid'\)/);
  assert.match(m, /addColumn\('store_id', 'uuid'\)/);
  assert.match(m, /membership_invitations_role_idx/);
  assert.match(m, /不接美团\/抖音实时人事或绩效/);
});

test('G1-W116: invite accepts roleCode + storeId and persists role_id/store_id on invitation', () => {
  const s = employeeService();
  assert.match(s, /roleCode = body\.roleCode/);
  assert.match(s, /storeId = body\.storeId/);
  assert.match(s, /select id from roles where tenant_id=\$1 and code=\$2/);
  assert.match(s, /select 1 from stores where id=\$1 and tenant_id=\$2/);
  assert.match(
    s,
    /membership_invitations \(id,tenant_id,organization_id,email,employee_code,title,role_id,store_id,token_hash/,
  );
  assert.match(s, /createRolePack|employee\.invited/);
});

test('G1-W116: accept activates and binds role package + store scope (membership_roles + store_managers + data_scopes)', () => {
  const s = employeeService();
  assert.match(s, /invite\.rows\[0\]\.role_id/);
  assert.match(
    s,
    /membership_roles\(id,tenant_id,membership_id,role_id\) values\(\$1,\$2,\$3,\$4\)/,
  );
  assert.match(s, /on conflict\(membership_id,role_id\) do nothing/);
  assert.match(s, /store_managers\(id,tenant_id,store_id,employee_id,status/);
  assert.match(s, /on conflict\(store_id,employee_id\)/);
  assert.match(s, /data_scopes\(id,tenant_id,membership_id,scope_type,scope_value,status/);
  assert.match(s, /on conflict\(membership_id,scope_type,scope_value\)/);
  assert.match(s, /employee\.accepted/);
});

test('G1-W116: management overview exposes role packages, stores, employee roles and store scope', () => {
  const s = managementService();
  const c = read('apps/api/src/management-organization-employee.controller.ts');
  assert.match(s, /roles: roles\.rows/);
  assert.match(s, /stores: stores\.rows/);
  assert.match(s, /array_agg\(distinct r\.code\)/);
  assert.match(s, /store_managers sm/);
  assert.match(s, /store_scope/);
  assert.match(s, /left join roles r on r\.id=i\.role_id/);
  assert.match(s, /role_code/);
  assert.match(s, /store_name/);
  assert.match(c, /tenant\.manage/);
});

test('G1-W116: organization-employees page offers role package + store select and shows role/store per row', () => {
  const p = page();
  const m = css();
  assert.match(p, /邀请角色包/);
  assert.match(p, /请选择角色包/);
  assert.match(p, /store_manager/);
  assert.match(p, /邀请门店范围/);
  assert.match(p, /不限定门店/);
  assert.match(p, /roleCode: form\.roleCode/);
  assert.match(p, /storeId: form\.storeId/);
  assert.match(p, /角色包分布/);
  assert.match(p, /employee\.roles\.map\(roleLabel\)/);
  assert.match(p, /employee\.store_scope/);
  assert.match(p, /门店范围：/);
  assert.match(p, /角色包与门店范围仅登记租户内访问授权/);
  assert.match(p, /roleLabel =/);
  assert.match(m, /grid-template-columns: repeat\(5, minmax\(0, 1fr\)\)/);
});

test('G1-W116: honest boundaries preserved — role refers to local authorization, no payment / no store-order / no fake', () => {
  const p = page();
  const s = employeeService();
  assert.match(p, /不接美团\/抖音实时人事或绩效/);
  assert.match(p, /非本平台下单/);
  assert.match(p, /不包含本平台收款/);
  assert.doesNotMatch(p, /Math\.random/);
  assert.doesNotMatch(p, /mockMetrics/);
  assert.doesNotMatch(s, /Math\.random/);
});

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const base = 'http://127.0.0.1:3083';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3083',
    DATABASE_URL: db,
    AUTH_TOKEN_SECRET: 'management-org-employees-w116',
  },
  stdio: 'ignore',
});
const headers = (token, extra = {}) => ({
  authorization: `Bearer ${token}`,
  'content-type': 'application/json',
  'x-request-id': randomUUID(),
  ...extra,
});
async function ready() {
  for (let i = 0; i < 40; i += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      /* starting */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw Error('API did not start');
}
async function login(email, tenantId) {
  const response = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'ChangeMe123!', tenantId }),
  });
  assert.equal(response.status, 201);
  return (await response.json()).accessToken;
}

test.after(() => api.kill());
test('G1-W116: invite→activate binds role package + store scope round-trip with real DB', async () => {
  await ready();
  const client = new Client({ connectionString: db });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const tenant = randomUUID();
  const organization = randomUUID();
  const owner = { user: randomUUID(), membership: randomUUID(), employee: randomUUID() };
  const ownerRole = randomUUID();
  const merchant = randomUUID();
  const store = randomUUID();
  try {
    await client.query(
      "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [tenant, `w116-${stamp.toLowerCase()}`, `W116 tenant ${stamp}`],
    );
    await client.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,'W116 org','team','active',null,null)",
      [organization, tenant, `w116-${stamp}`],
    );
    await client.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
      [owner.user, `W116OWN${stamp}@example.test`, 'W116 owner'],
    );
    await client.query(
      "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [owner.membership, tenant, owner.user],
    );
    // supervisor role granting employee.manage + organization.manage
    await client.query(
      "insert into roles(id,tenant_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null)",
      [ownerRole, tenant, 'supervisor', 'W116 Supervisor'],
    );
    for (const permId of [
      '00000000-0000-4000-8000-000000000106',
      '00000000-0000-4000-8000-000000000104',
    ]) {
      await client.query(
        "insert into role_permissions(id,tenant_id,role_id,permission_id,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null) on conflict(role_id,permission_id) do nothing",
        [randomUUID(), tenant, ownerRole, permId],
      );
    }
    await client.query(
      'insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,$4)',
      [randomUUID(), tenant, owner.membership, ownerRole],
    );
    await client.query(
      "insert into employees(id,tenant_id,membership_id,organization_id,employee_code,title,status,created_by,updated_by) values($1,$2,$3,$4,$5,'Advisor','active',null,null)",
      [owner.employee, tenant, owner.membership, organization, `W116E${stamp}`],
    );
    // employee + store_manager role packages (invitables)
    await client.query(
      "insert into roles(id,tenant_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null)",
      [randomUUID(), tenant, 'store_manager', 'Store Manager'],
    );
    await client.query(
      "insert into roles(id,tenant_id,code,name,status,created_by,updated_by) values($1,$2,'employee','Employee','active',null,null)",
      [randomUUID(), tenant],
    );
    await client.query(
      "insert into merchants(id,tenant_id,organization_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,$5,'active',null,null)",
      [merchant, tenant, organization, `W116M${stamp}`, `W116 merchant ${stamp}`],
    );
    await client.query(
      "insert into stores(id,tenant_id,organization_id,merchant_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,$5,$6,'active',null,null)",
      [store, tenant, organization, merchant, `W116S${stamp}`, `W116 store ${stamp}`],
    );

    const ownerToken = await login(`W116OWN${stamp}@example.test`, tenant);
    const inviteEmail = `w116staff${stamp}@example.test`;

    // invite with role package + store scope
    const inviteRes = await fetch(`${base}/api/v1/employees/invitations`, {
      method: 'POST',
      headers: headers(ownerToken, { 'idempotency-key': randomUUID() }),
      body: JSON.stringify({
        email: inviteEmail,
        employeeCode: `W116S-${stamp}`,
        organizationId: organization,
        title: '店长',
        roleCode: 'store_manager',
        storeId: store,
      }),
    });
    assert.equal(inviteRes.status, 201, 'invite created');
    const inviteData = (await inviteRes.json()).data;
    assert.ok(inviteData.role_id, 'invite carries a role_id');
    assert.equal(inviteData.store_id, store);
    assert.ok(inviteData.invitationToken, 'invite carries accept token');

    // accept (activate) with token → binds role package + store scope
    const acceptRes = await fetch(`${base}/api/v1/employees/invitations/${inviteData.id}/accept`, {
      method: 'POST',
      headers: headers(ownerToken),
      body: JSON.stringify({
        invitationToken: inviteData.invitationToken,
        displayName: 'W116 Staff',
      }),
    });
    assert.equal(acceptRes.status, 201, 'accept activated');
    const accepted = (await acceptRes.json()).data;

    // verify membership_roles + store_managers + data_scopes were bound
    const roleBind = await client.query(
      `select 1 from employees e join membership_roles mr on mr.membership_id=e.membership_id join roles r on r.id=mr.role_id where e.id=$1 and e.tenant_id=$2 and r.code='store_manager'`,
      [accepted.id, tenant],
    );
    assert.ok(roleBind.rowCount === 1, 'store_manager role package bound');
    const storeBind = await client.query(
      "select 1 from store_managers where employee_id=$1 and tenant_id=$2 and store_id=$3 and status='active' and deleted_at is null",
      [accepted.id, tenant, store],
    );
    assert.ok(storeBind.rowCount === 1, 'store_managers scope bound');
    const scopeBind = await client.query(
      `select 1 from data_scopes ds join employees e on e.membership_id=ds.membership_id where e.id=$1 and ds.tenant_id=$2 and ds.scope_type='store' and ds.scope_value=$3 and ds.status='active'`,
      [accepted.id, tenant, store],
    );
    assert.ok(scopeBind.rowCount === 1, 'data_scopes store bound');

    // cross-tenant guard
    const guarded = await fetch(`${base}/api/v1/management/organization-employees`, {
      headers: headers(ownerToken, { 'x-tenant-context': randomUUID() }),
    });
    assert.ok([403, 404].includes(guarded.status), 'wrong tenant denied');

    // overview returns employee with roles + store_scope
    const overviewRes = await fetch(`${base}/api/v1/management/organization-employees`, {
      headers: headers(ownerToken),
    });
    assert.equal(overviewRes.status, 200);
    const overview = (await overviewRes.json()).data;
    assert.ok(Array.isArray(overview.roles) && overview.roles.length >= 3, 'roles list present');
    assert.ok(Array.isArray(overview.stores), 'stores list present');
    const staff = overview.employees.find((e) => e.id === accepted.id);
    assert.ok(staff, 'activated staff present');
    assert.ok(staff.roles.includes('store_manager'), 'staff roles include store_manager');
    assert.ok(staff.store_scope.includes(store), 'staff store_scope includes target store');
    const pending = overview.invitations.find((i) => i.id === inviteData.id);
    assert.equal(pending, undefined, 'accepted invitation is no longer pending');
  } finally {
    await client.end();
  }
});
