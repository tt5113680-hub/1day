import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { Client } from '../../apps/api/node_modules/pg/esm/index.mjs';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const tenant = '00000000-0000-4000-8000-000000000001';
const api = 'http://127.0.0.1:3054';
let client: Client;
let token = '';

test.beforeAll(async () => {
  client = new Client({ connectionString: db });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const organization = randomUUID();
  const user = randomUUID();
  const membership = randomUUID();
  const employee = randomUUID();
  const customer = randomUUID();
  const email = `browser-workbench-${stamp}@example.test`;
  await client.query(
    "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,'Browser workbench org','team','active',null,null)",
    [organization, tenant, `browser-wb-org-${stamp}`],
  );
  await client.query(
    "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,'Mobile Advisor',password_hash,'active',null,null from users where email='admin@system.local'",
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
    [employee, tenant, membership, organization, `BWB-${stamp}`],
  );
  await client.query(
    "insert into customers(id,tenant_id,display_name,status,created_by,updated_by) values($1,$2,'Mobile Customer','active',null,null)",
    [customer, tenant],
  );
  await client.query(
    "insert into tasks(id,tenant_id,customer_id,assignee_employee_id,title,due_at,status,created_by,updated_by) values($1,$2,$3,$4,'Follow up mobile customer',now()+interval '1 hour','open',null,null)",
    [randomUUID(), tenant, customer, employee],
  );
  const login = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'ChangeMe123!', tenantId: tenant }),
  });
  expect(login.status).toBe(201);
  token = (await login.json()).accessToken;
});
test.afterAll(async () => client.end());

test('employee completes a real customer task at 390px', async ({ page }) => {
  await page.addInitScript((value) => sessionStorage.setItem('oneday.accessToken', value), token);
  await page.goto('/e/workbench');
  await expect(page.getByRole('heading', { name: '你好，Mobile Advisor' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Follow up mobile customer', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('客户：Mobile Customer', { exact: true })).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-E-001/employee-workbench-mobile.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: '完成' }).click();
  await expect(page.getByRole('status')).toContainText('行动记录已同步');
});

test('employee workbench shows login recovery state without a session', async ({ page }) => {
  await page.goto('/e/workbench');
  await expect(page.getByRole('heading', { name: '需要员工登录' })).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-E-001/employee-workbench-forbidden.png',
    fullPage: true,
  });
});
