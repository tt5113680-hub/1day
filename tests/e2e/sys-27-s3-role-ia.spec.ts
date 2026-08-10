import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { Client } from '../../apps/api/node_modules/pg/esm/index.mjs';

const api = 'http://127.0.0.1:3341';
const platform = 'http://localhost:3342';
const employee = 'http://localhost:3343';
const systemTenant = '00000000-0000-4000-8000-000000000001';
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';

async function seedStoreManager() {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const tenantId = randomUUID();
  const userId = randomUUID();
  const membershipId = randomUUID();
  const roleId = randomUUID();
  const orgId = randomUUID();
  const merchantId = randomUUID();
  const employeeId = randomUUID();
  const storeId = randomUUID();
  const email = `sys27-sm-${stamp}@example.local`;
  const client = new Client({ connectionString: db });
  await client.connect();
  try {
    await client.query(
      "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [tenantId, `sys27-${stamp}`, `SYS27 ${stamp}`],
    );
    await client.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
      [userId, email, 'SYS27 Store Manager'],
    );
    await client.query(
      "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [membershipId, tenantId, userId],
    );
    await client.query(
      "insert into roles(id,tenant_id,code,name,status,created_by,updated_by) values($1,$2,'store_manager','Store Manager','active',null,null)",
      [roleId, tenantId],
    );
    await client.query(
      'insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,$4)',
      [randomUUID(), tenantId, membershipId, roleId],
    );
    const taskRead = await client.query("select id from permissions where code='task.read' limit 1");
    const customerRead = await client.query(
      "select id from permissions where code='customer.read' limit 1",
    );
    for (const permissionId of [taskRead.rows[0].id, customerRead.rows[0].id]) {
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
      "insert into merchants(id,tenant_id,organization_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,$5,'active',null,null)",
      [merchantId, tenantId, orgId, `M-${stamp}`, `Merchant ${stamp}`],
    );
    await client.query(
      "insert into employees(id,tenant_id,membership_id,organization_id,employee_code,title,status,created_by,updated_by) values($1,$2,$3,$4,$5,'Store Manager','active',null,null)",
      [employeeId, tenantId, membershipId, orgId, `E-${stamp}`],
    );
    await client.query(
      "insert into stores(id,tenant_id,organization_id,merchant_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,$5,$6,'active',null,null)",
      [storeId, tenantId, orgId, merchantId, `S-${stamp}`, `国贸测试店 ${stamp}`],
    );
    await client.query(
      "insert into store_managers(id,tenant_id,store_id,employee_id,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null)",
      [randomUUID(), tenantId, storeId, employeeId],
    );
  } finally {
    await client.end();
  }
  return { email, tenantId, storeName: `国贸测试店 ${stamp}` };
}

test('SYS-27 Platform product homes and Employee store-manager chrome', async ({ browser }) => {
  mkdirSync('evidence/SYS-27', { recursive: true });

  const platformLogin = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@system.local',
      password: 'ChangeMe123!',
      tenantId: systemTenant,
    }),
  });
  expect(platformLogin.status).toBe(201);
  const platformTokens = (await platformLogin.json()) as {
    accessToken: string;
    refreshToken: string;
  };

  const platformPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await platformPage.addInitScript(
    ([access, refresh]) => {
      sessionStorage.setItem('oneday.accessToken', access);
      sessionStorage.setItem('oneday.refreshToken', refresh);
      sessionStorage.setItem('oneday.accessExpiresAt', String(Date.now() + 15 * 60 * 1000));
    },
    [platformTokens.accessToken, platformTokens.refreshToken],
  );
  await platformPage.goto(`${platform}/p/dashboard`);
  await expect(platformPage.getByRole('heading', { name: '平台运营首页' })).toBeVisible({
    timeout: 20000,
  });
  const roleSwitcher = platformPage.getByRole('navigation', { name: '角色工作区' });
  await expect(roleSwitcher.getByRole('link', { name: '渠道经营' })).toBeVisible();
  await expect(roleSwitcher.getByRole('link', { name: '商圈经营' })).toBeVisible();
  await platformPage.screenshot({
    path: 'evidence/SYS-27/platform-product-home.png',
    fullPage: false,
  });
  await roleSwitcher.getByRole('link', { name: '渠道经营' }).click();
  await expect(platformPage).toHaveURL(/\/ch\/dashboard/);
  await expect(platformPage.getByRole('heading', { name: '渠道经营首页' })).toBeVisible({
    timeout: 15000,
  });
  await platformPage.screenshot({
    path: 'evidence/SYS-27/channel-product-home.png',
    fullPage: false,
  });
  await platformPage.close();

  const seeded = await seedStoreManager();
  const employeeLogin = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: seeded.email,
      password: 'ChangeMe123!',
      tenantId: seeded.tenantId,
    }),
  });
  expect(employeeLogin.status).toBe(201);
  const employeeTokens = (await employeeLogin.json()) as {
    accessToken: string;
    refreshToken: string;
  };

  const employeePage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await employeePage.addInitScript(
    ([access, refresh]) => {
      sessionStorage.setItem('oneday.accessToken', access);
      sessionStorage.setItem('oneday.refreshToken', refresh);
      sessionStorage.setItem('oneday.accessExpiresAt', String(Date.now() + 15 * 60 * 1000));
    },
    [employeeTokens.accessToken, employeeTokens.refreshToken],
  );
  await employeePage.goto(`${employee}/e/store`);
  await expect(employeePage.getByRole('heading', { name: '门店经营首页' })).toBeVisible({
    timeout: 20000,
  });
  await expect(employeePage.getByRole('heading', { name: '店长能力包' })).toBeVisible();
  await expect(employeePage.getByRole('link', { name: '会员核销' }).first()).toHaveAttribute(
    'href',
    '/e/memberships',
  );
  const desktopNav = employeePage.getByRole('complementary', { name: '员工桌面导航' });
  await expect(desktopNav).toBeVisible();
  await expect(desktopNav.getByText('店长模式')).toBeVisible();
  await expect(desktopNav.getByRole('link', { name: '门店' })).toBeVisible();
  await employeePage.screenshot({
    path: 'evidence/SYS-27/employee-store-manager-chrome.png',
    fullPage: false,
  });
  await employeePage.close();
});
