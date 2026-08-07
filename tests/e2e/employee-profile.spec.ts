import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { Client } from '../../apps/api/node_modules/pg/esm/index.mjs';
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test',
  tenant = '00000000-0000-4000-8000-000000000001',
  api = 'http://127.0.0.1:3079';
let client: Client,
  token = '';
test.beforeAll(async () => {
  client = new Client({ connectionString: db });
  await client.connect();
  const s = `${Date.now()}${Math.floor(Math.random() * 1000)}`,
    org = randomUUID(),
    merchant = randomUUID(),
    user = randomUUID(),
    membership = randomUUID(),
    employee = randomUUID(),
    email = `browser-profile-${s}@example.test`;
  await client.query(
    "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,'Browser profile org','team','active',null,null)",
    [org, tenant, `bprofile-${s}`],
  );
  await client.query(
    "insert into merchants(id,tenant_id,organization_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,'Browser profile merchant','active',null,null)",
    [merchant, tenant, org, `bmerchant-${s}`],
  );
  await client.query(
    "insert into stores(id,tenant_id,organization_id,merchant_id,code,name,address,status,created_by,updated_by) values($1,$2,$3,$4,$5,'Browser profile store','Profile lane','active',null,null)",
    [randomUUID(), tenant, org, merchant, `bstore-${s}`],
  );
  await client.query(
    "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,'Mobile profile advisor',password_hash,'active',null,null from users where email='admin@system.local'",
    [user, email],
  );
  await client.query(
    "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
    [membership, tenant, user],
  );
  await client.query(
    "insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,'00000000-0000-4000-8000-000000000004')",
    [randomUUID(), tenant, membership],
  );
  await client.query(
    "insert into employees(id,tenant_id,membership_id,organization_id,employee_code,title,status,created_by,updated_by) values($1,$2,$3,$4,$5,'Advisor','active',null,null)",
    [employee, tenant, membership, org, `BPROFILE-${s}`],
  );
  const r = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'ChangeMe123!', tenantId: tenant }),
  });
  expect(r.status).toBe(201);
  token = (await r.json()).accessToken;
});
test.afterAll(async () => client.end());
test('employee views profile and changes own notification setting at 390px', async ({ page }) => {
  await page.addInitScript((v) => sessionStorage.setItem('oneday.accessToken', v), token);
  await page.goto('/e/profile');
  await expect(page.getByRole('heading', { name: 'Mobile profile advisor' })).toBeVisible();
  await expect(page.getByText('Browser profile store')).toBeVisible();
  await page.getByRole('button', { name: '免打扰 8 小时' }).click();
  await expect(page.getByRole('status')).toHaveText('通知设置已更新。');
  await page.screenshot({
    path: 'evidence/PAGE-E-009/employee-profile-mobile.png',
    fullPage: false,
  });
});
test('employee profile has no-session recovery', async ({ page }) => {
  await page.goto('/e/profile');
  await expect(page.getByRole('heading', { name: '无法查看个人空间' })).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-E-009/employee-profile-forbidden.png',
    fullPage: true,
  });
});
