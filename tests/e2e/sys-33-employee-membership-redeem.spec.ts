import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { Client } from '../../apps/api/node_modules/pg/esm/index.mjs';

const api = 'http://127.0.0.1:3355';
const employee = 'http://localhost:3356';
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';

async function seedEmployee() {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const tenantId = randomUUID();
  const userId = randomUUID();
  const membershipId = randomUUID();
  const roleId = randomUUID();
  const orgId = randomUUID();
  const employeeId = randomUUID();
  const email = `sys33-ui-${stamp}@example.local`;
  const client = new Client({ connectionString: db });
  await client.connect();
  try {
    await client.query(
      "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [tenantId, `sys33ui-${stamp}`, `SYS33UI ${stamp}`],
    );
    await client.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
      [userId, email, 'SYS33 UI Employee'],
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
      [orgId, tenantId, `ORG33UI-${stamp}`, `Org33UI ${stamp}`],
    );
    await client.query(
      "insert into employees(id,tenant_id,membership_id,organization_id,employee_code,title,status,created_by,updated_by) values($1,$2,$3,$4,$5,'Staff','active',null,null)",
      [employeeId, tenantId, membershipId, orgId, `E33UI-${stamp}`],
    );
  } finally {
    await client.end();
  }
  return { email, tenantId };
}

test('SYS-33 Employee membership redeem page is first-class', async ({ page }) => {
  mkdirSync('evidence/SYS-33', { recursive: true });
  const seeded = await seedEmployee();
  const login = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: seeded.email,
      password: 'ChangeMe123!',
      tenantId: seeded.tenantId,
    }),
  });
  expect(login.status).toBe(201);
  const tokens = (await login.json()) as { accessToken: string; refreshToken: string };

  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(
    ([access, refresh]) => {
      sessionStorage.setItem('oneday.accessToken', access);
      sessionStorage.setItem('oneday.refreshToken', refresh);
      sessionStorage.setItem('oneday.accessExpiresAt', String(Date.now() + 15 * 60 * 1000));
    },
    [tokens.accessToken, tokens.refreshToken],
  );

  await page.goto(`${employee}/e/workbench`);
  await expect(page.getByRole('link', { name: '打开核销' })).toHaveAttribute(
    'href',
    '/e/memberships',
    { timeout: 15000 },
  );
  await page.getByRole('link', { name: '打开核销' }).click();
  await expect(page).toHaveURL(/\/e\/memberships$/);
  await expect(page.getByTestId('employee-membership-redeem')).toBeVisible();
  await expect(page.getByRole('heading', { name: '会员权益核销' })).toBeVisible();
  await expect(page.getByLabel('会员码')).toBeVisible();
  await expect(page.getByLabel('核销权益')).toBeVisible();
  await page.screenshot({
    path: 'evidence/SYS-33/employee-membership-redeem.png',
    fullPage: false,
  });
});
