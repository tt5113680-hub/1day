import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { Client } from '../../apps/api/node_modules/pg/esm/index.mjs';

const api = 'http://127.0.0.1:3273';
const employee = 'http://localhost:3274';
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';

async function seedEmployee() {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const tenantId = randomUUID();
  const userId = randomUUID();
  const membershipId = randomUUID();
  const roleId = randomUUID();
  const orgId = randomUUID();
  const employeeId = randomUUID();
  const email = `p1bshell-emp-${stamp}@example.local`;
  const client = new Client({ connectionString: db });
  await client.connect();
  try {
    await client.query(
      "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [tenantId, `p1b-shell-${stamp}`, `P1B Shell ${stamp}`],
    );
    await client.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
      [userId, email, 'P1B Shell Staff'],
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
    const customerRead = await client.query(
      "select id from permissions where code='customer.read' limit 1",
    );
    for (const permissionId of [
      taskRead.rows[0].id,
      taskManage.rows[0].id,
      customerRead.rows[0].id,
    ]) {
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
  } finally {
    await client.end();
  }
  return { email, tenantId };
}

test('P1-B Employee shell shares token-driven nav across mobile and desktop viewports', async ({
  page,
}) => {
  mkdirSync('evidence/P1-B-EMPLOYEE-SHELL', { recursive: true });
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

  await page.addInitScript(
    ([access, refresh]) => {
      sessionStorage.setItem('oneday.accessToken', access);
      sessionStorage.setItem('oneday.refreshToken', refresh);
      sessionStorage.setItem('oneday.accessExpiresAt', String(Date.now() + 15 * 60 * 1000));
    },
    [tokens.accessToken, tokens.refreshToken],
  );

  // Mobile (390px): shared bottom nav chrome with the employee links and one active.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${employee}/e/workbench`);
  const bottom = page.locator('.od-employee-nav--bottom');
  await expect(bottom).toBeVisible({ timeout: 30000 });
  await expect(bottom.locator('.od-employee-nav__link').first()).toContainText('工作台');
  await expect(bottom.locator('.od-employee-nav__link--active')).toHaveCount(1);
  await expect(
    bottom.locator('.od-employee-nav__link--active'),
  ).toHaveAttribute('aria-current', 'page');
  await page.screenshot({
    path: 'evidence/P1-B-EMPLOYEE-SHELL/employee-shell-mobile-390.png',
    fullPage: true,
  });

  // Tablet (768px): desktop sidebar appears and bottom nav is hidden.
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.reload();
  const desktop = page.locator('.od-employee-nav--desktop');
  await expect(desktop).toBeVisible({ timeout: 30000 });
  await expect(bottom).toBeHidden();
  await expect(desktop.locator('.od-employee-nav__link--active')).toHaveCount(1);
  await expect(desktop.locator('.od-employee-nav__brand')).toContainText('ONEDAY 员工');
  await page.screenshot({
    path: 'evidence/P1-B-EMPLOYEE-SHELL/employee-shell-tablet-768.png',
    fullPage: true,
  });

  // Desktop (1440px): sticky sidebar nav remains the navigation surface.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.reload();
  await expect(page.locator('.od-employee-nav--desktop')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('.od-employee-nav--bottom')).toBeHidden();
  await expect(page.locator('.od-employee-nav--desktop .od-employee-nav__link--active')).toHaveCount(
    1,
  );
  await page.screenshot({
    path: 'evidence/P1-B-EMPLOYEE-SHELL/employee-shell-desktop-1440.png',
    fullPage: true,
  });
});
