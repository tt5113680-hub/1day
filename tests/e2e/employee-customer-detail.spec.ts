import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { Client } from '../../apps/api/node_modules/pg/esm/index.mjs';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const tenant = '00000000-0000-4000-8000-000000000001';
const api = 'http://127.0.0.1:3060';
let client: Client;
let token = '';
let refreshToken = '';
let accessExpiresAt = '';
let customer = '';
test.beforeAll(async () => {
  client = new Client({ connectionString: db });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const org = randomUUID(),
    user = randomUUID(),
    membership = randomUUID(),
    employee = randomUUID(),
    task = randomUUID();
  customer = randomUUID();
  const email = `browser-customer-${stamp}@example.test`;
  await client.query(
    "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,'Browser customer org','team','active',null,null)",
    [org, tenant, `bc-org-${stamp}`],
  );
  await client.query(
    "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,'Mobile Customer Advisor',password_hash,'active',null,null from users where email='admin@system.local'",
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
    [employee, tenant, membership, org, `BC-${stamp}`],
  );
  await client.query(
    "insert into customers(id,tenant_id,display_name,status,created_by,updated_by) values($1,$2,'Browser Customer','active',null,null)",
    [customer, tenant],
  );
  await client.query(
    "insert into customer_identities(id,tenant_id,customer_id,identity_type,identity_value_hash,masked_value,status,created_by,updated_by) values($1,$2,$3,'phone',$4,'139****6789','active',null,null)",
    [randomUUID(), tenant, customer, `${stamp}`.padEnd(64, 'b')],
  );
  await client.query(
    "insert into customer_ownerships(id,tenant_id,customer_id,employee_id,ownership_role,status,created_by,updated_by) values($1,$2,$3,$4,'owner','active',null,null)",
    [randomUUID(), tenant, customer, employee],
  );
  await client.query(
    "insert into customer_sources(id,tenant_id,customer_id,source_role,source_type,status,created_by,updated_by) values($1,$2,$3,'first_source','referral','active',null,null)",
    [randomUUID(), tenant, customer],
  );
  await client.query(
    "insert into customer_tags(id,tenant_id,customer_id,label,created_by,updated_by) values($1,$2,$3,'VIP',null,null)",
    [randomUUID(), tenant, customer],
  );
  await client.query(
    "insert into tasks(id,tenant_id,customer_id,assignee_employee_id,title,due_at,status,created_by,updated_by) values($1,$2,$3,$4,'Call browser customer',now()+interval '1 hour','open',null,null)",
    [task, tenant, customer, employee],
  );
  const login = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'ChangeMe123!', tenantId: tenant }),
  });
  expect(login.status).toBe(201);
  const session = await login.json();
  token = session.accessToken;
  refreshToken = session.refreshToken;
  accessExpiresAt = session.expiresAt;
});
test.afterAll(async () => client.end());
test('employee views a related customer detail at 390px', async ({ page }) => {
  await page.addInitScript(
    ({ accessToken, refreshToken, accessExpiresAt }) => {
      sessionStorage.setItem('oneday.accessToken', accessToken);
      sessionStorage.setItem('oneday.refreshToken', refreshToken);
      sessionStorage.setItem('oneday.accessExpiresAt', accessExpiresAt);
    },
    { accessToken: token, refreshToken, accessExpiresAt },
  );
  await page.goto(`/e/customers/${customer}`);
  await expect(page.getByRole('heading', { name: 'Browser Customer', exact: true })).toBeVisible();
  await expect(page.getByText('139****6789', { exact: false })).toBeVisible();
  await expect(page.getByText('# VIP', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: '查看' })).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-E-003/employee-customer-detail-mobile-v3.png',
    fullPage: false,
  });
  await page.getByRole('link', { name: '查看' }).click();
  await expect(
    page.getByRole('heading', { name: 'Call browser customer', exact: true }),
  ).toBeVisible();
});
test('employee customer detail has an access recovery state without a session', async ({
  page,
}) => {
  await page.goto(`/e/customers/${customer}`);
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { name: '员工登录' })).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-E-003/employee-customer-detail-forbidden-v2.png',
    fullPage: true,
  });
});
