import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { Client } from '../../apps/api/node_modules/pg/esm/index.mjs';

const api = 'http://127.0.0.1:3351';
const employee = 'http://localhost:3352';
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';

async function seedEmployeeWithCustomer() {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const tenantId = randomUUID();
  const userId = randomUUID();
  const membershipId = randomUUID();
  const roleId = randomUUID();
  const orgId = randomUUID();
  const employeeId = randomUUID();
  const customerId = randomUUID();
  const email = `sys31-ui-${stamp}@example.local`;
  const client = new Client({ connectionString: db });
  await client.connect();
  try {
    await client.query(
      "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [tenantId, `sys31ui-${stamp}`, `SYS31UI ${stamp}`],
    );
    await client.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
      [userId, email, 'SYS31 UI'],
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
    const customerRead = await client.query(
      "select id from permissions where code='customer.read' limit 1",
    );
    const taskRead = await client.query("select id from permissions where code='task.read' limit 1");
    for (const permissionId of [customerRead.rows[0].id, taskRead.rows[0].id]) {
      await client.query(
        "insert into role_permissions(id,tenant_id,role_id,permission_id,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null)",
        [randomUUID(), tenantId, roleId, permissionId],
      );
    }
    await client.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,$4,'merchant','active',null,null)",
      [orgId, tenantId, `ORG-${stamp}`, `Org ${stamp}`],
    );
    await client.query(
      "insert into employees(id,tenant_id,membership_id,organization_id,employee_code,title,status,created_by,updated_by) values($1,$2,$3,$4,$5,'Staff','active',null,null)",
      [employeeId, tenantId, membershipId, orgId, `E-${stamp}`],
    );
    await client.query(
      "insert into customers(id,tenant_id,display_name,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [customerId, tenantId, `目录客户 ${stamp}`],
    );
    await client.query(
      "insert into customer_ownerships(id,tenant_id,customer_id,employee_id,ownership_role,status,created_by,updated_by) values($1,$2,$3,$4,'owner','active',null,null)",
      [randomUUID(), tenantId, customerId, employeeId],
    );
  } finally {
    await client.end();
  }
  return { email, tenantId, customerName: `目录客户 ${stamp}` };
}

test('SYS-31 Employee 客户 tab opens scoped customer directory', async ({ page }) => {
  mkdirSync('evidence/SYS-31', { recursive: true });
  const seeded = await seedEmployeeWithCustomer();
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
  const customersTab = page.getByRole('navigation', { name: '员工工作导航' }).getByRole('link', {
    name: '客户',
  });
  await expect(customersTab).toHaveAttribute('href', '/e/customers', { timeout: 15000 });
  await customersTab.click();
  await expect(page).toHaveURL(/\/e\/customers$/);
  await expect(page.getByRole('heading', { name: '客户目录' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('heading', { name: seeded.customerName })).toBeVisible();
  await expect(page.getByRole('link', { name: '获客池' })).toBeVisible();
  await page.screenshot({
    path: 'evidence/SYS-31/employee-customer-directory.png',
    fullPage: false,
  });
});
