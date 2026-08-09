import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { Client } from '../../apps/api/node_modules/pg/esm/index.mjs';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const tenant = '00000000-0000-4000-8000-000000000001';
const api = 'http://127.0.0.1:3076';
let client: Client;
let token = '';
let refreshToken = '';
let accessExpiresAt = '';
let taskId = '';

test.beforeAll(async () => {
  client = new Client({ connectionString: db });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const organization = randomUUID();
  const user = randomUUID();
  const membership = randomUUID();
  const employee = randomUUID();
  const customer = randomUUID();
  taskId = randomUUID();
  const email = `browser-notifications-${stamp}@example.test`;
  await client.query(
    "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,'Browser notification org','team','active',null,null)",
    [organization, tenant, `bnotification-${stamp}`],
  );
  await client.query(
    "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,'Mobile notification advisor',password_hash,'active',null,null from users where email='admin@system.local'",
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
    [employee, tenant, membership, organization, `BNOTIFICATION-${stamp}`],
  );
  await client.query(
    "insert into customers(id,tenant_id,display_name,status,created_by,updated_by) values($1,$2,'Mobile notification customer','active',null,null)",
    [customer, tenant],
  );
  await client.query(
    "insert into tasks(id,tenant_id,customer_id,assignee_employee_id,title,reason,due_at,created_by,updated_by) values($1,$2,$3,$4,'Confirm mobile notification','Browser verification',now()+interval '1 day',null,null)",
    [taskId, tenant, customer, employee],
  );
  await client.query(
    "insert into notification_logs(id,tenant_id,task_id,employee_id,notification_type,created_by,updated_by) values($1,$2,$3,$4,'reminder',null,null)",
    [randomUUID(), tenant, taskId, employee],
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

test('employee reads a task notification and retains its safe task deep link at 390px', async ({
  page,
}) => {
  await page.addInitScript(
    ({ accessToken, refreshToken, accessExpiresAt }) => {
      sessionStorage.setItem('oneday.accessToken', accessToken);
      sessionStorage.setItem('oneday.refreshToken', refreshToken);
      sessionStorage.setItem('oneday.accessExpiresAt', accessExpiresAt);
    },
    { accessToken: token, refreshToken, accessExpiresAt },
  );
  await page.goto('/e/notifications');
  await expect(page.getByRole('heading', { name: '把该处理的事，留在眼前' })).toBeVisible();
  const card = page.locator('section.od-card', { hasText: 'Confirm mobile notification' });
  await expect(card).toBeVisible();
  await expect(card.getByRole('link', { name: '查看处理' })).toHaveAttribute(
    'href',
    `/e/tasks/${taskId}`,
  );
  await card.getByRole('button', { name: '标为已读' }).click();
  await expect(page.getByRole('status')).toHaveText('通知已标记为已读。');
  await page.screenshot({
    path: 'evidence/PAGE-E-008/employee-notifications-mobile-v3.png',
    fullPage: false,
  });
});

test('employee notifications provides recovery without a session', async ({ page }) => {
  await page.goto('/e/notifications');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { name: '员工登录' })).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-E-008/employee-notifications-forbidden-v2.png',
    fullPage: true,
  });
});
