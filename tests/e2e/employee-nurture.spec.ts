import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { Client } from '../../apps/api/node_modules/pg/esm/index.mjs';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const tenant = '00000000-0000-4000-8000-000000000001';
const api = 'http://127.0.0.1:3073';
let client: Client;
let token = '';
let refreshToken = '';
let accessExpiresAt = '';
let customerName = '';

test.beforeAll(async () => {
  client = new Client({ connectionString: db });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const organization = randomUUID();
  const user = randomUUID();
  const membership = randomUUID();
  const employee = randomUUID();
  const customer = randomUUID();
  customerName = `Mobile nurture customer ${stamp}`;
  const email = `browser-nurture-${stamp}@example.test`;
  await client.query(
    "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,'Browser nurture org','team','active',null,null)",
    [organization, tenant, `bnurture-${stamp}`],
  );
  await client.query(
    "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,'Mobile nurture advisor',password_hash,'active',null,null from users where email='admin@system.local'",
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
    [employee, tenant, membership, organization, `BNURTURE-${stamp}`],
  );
  await client.query(
    "insert into customers(id,tenant_id,display_name,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
    [customer, tenant, customerName],
  );
  await client.query(
    "insert into employee_nurture_profiles(id,tenant_id,customer_id,employee_id,segment,next_touch_at,created_by,updated_by) values($1,$2,$3,$4,'dormant',now()+interval '1 day',null,null)",
    [randomUUID(), tenant, customer, employee],
  );
  const response = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'ChangeMe123!', tenantId: tenant }),
  });
  expect(response.status).toBe(201);
  const login = await response.json();
  token = login.accessToken;
  refreshToken = login.refreshToken;
  accessExpiresAt = login.expiresAt;
});

test.afterAll(async () => client.end());

test('employee retiers, records touch and creates a nurture task at 390px', async ({ page }) => {
  await page.addInitScript(
    ({ accessToken, refreshToken, accessExpiresAt }) => {
      sessionStorage.setItem('oneday.accessToken', accessToken);
      sessionStorage.setItem('oneday.refreshToken', refreshToken);
      sessionStorage.setItem('oneday.accessExpiresAt', accessExpiresAt);
    },
    { accessToken: token, refreshToken, accessExpiresAt },
  );
  await page.goto('/e/nurture');
  await expect(page.locator('main > header h1')).toBeVisible();
  const card = page.locator('section.od-card', { hasText: customerName });
  await expect(card).toBeVisible();
  await card.locator('select').selectOption('repurchase');
  await expect(page.getByRole('status')).toBeVisible();
  await expect(card.locator('select')).toHaveValue('repurchase');
  await card.locator('button').first().click();
  await expect(page.getByRole('status')).toBeVisible();
  await card.locator('button').nth(1).click();
  await expect(page.getByRole('status')).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-E-007/employee-nurture-mobile-v2.png',
    fullPage: false,
  });
});

test('employee nurture route provides recovery without a session', async ({ page }) => {
  await page.goto('/e/nurture');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { name: '员工登录' })).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-E-007/employee-nurture-forbidden-v2.png',
    fullPage: true,
  });
});
