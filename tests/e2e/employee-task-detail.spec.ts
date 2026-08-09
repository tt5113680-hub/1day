import { expect, test } from '@playwright/test';
import { createHash, randomUUID } from 'node:crypto';
import { Client } from '../../apps/api/node_modules/pg/esm/index.mjs';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const tenant = '00000000-0000-4000-8000-000000000001';
const api = 'http://127.0.0.1:3057';
let client: Client;
let token = '';
let refreshToken = '';
let task = '';

test.beforeAll(async () => {
  client = new Client({ connectionString: db });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const organization = randomUUID();
  const user = randomUUID();
  const membership = randomUUID();
  const employee = randomUUID();
  const customer = randomUUID();
  const order = randomUUID();
  const evidence = randomUUID();
  const email = `browser-task-detail-${stamp}@example.test`;
  task = randomUUID();
  await client.query(
    "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,'Browser task detail org','team','active',null,null)",
    [organization, tenant, `browser-td-org-${stamp}`],
  );
  await client.query(
    "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,'Mobile Detail Advisor',password_hash,'active',null,null from users where email='admin@system.local'",
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
    [employee, tenant, membership, organization, `BTD-${stamp}`],
  );
  await client.query(
    "insert into customers(id,tenant_id,display_name,status,created_by,updated_by) values($1,$2,'Browser Evidence Customer','active',null,null)",
    [customer, tenant],
  );
  await client.query(
    "insert into customer_orders(id,tenant_id,customer_id,order_number,occurred_at,status,created_by,updated_by) values($1,$2,$3,$4,now(),'active',null,null)",
    [order, tenant, customer, `BTD-ORDER-${stamp}`],
  );
  const content = Buffer.from('browser-evidence');
  await client.query(
    "insert into evidence_files(id,tenant_id,order_id,evidence_type,original_filename,media_type,byte_size,content_sha256,content,status,created_by,updated_by) values($1,$2,$3,'receipt','browser-receipt.png','image/png',$4,$5,$6,'active',null,null)",
    [
      evidence,
      tenant,
      order,
      content.length,
      createHash('sha256').update(content).digest('hex'),
      content,
    ],
  );
  await client.query(
    "insert into tasks(id,tenant_id,customer_id,assignee_employee_id,title,reason,due_at,status,created_by,updated_by) values($1,$2,$3,$4,'Confirm browser evidence','Customer requested proof before callback.',now()+interval '1 hour','open',null,null)",
    [task, tenant, customer, employee],
  );
  const login = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'ChangeMe123!', tenantId: tenant }),
  });
  expect(login.status).toBe(201);
  ({ accessToken: token, refreshToken } = (await login.json()) as {
    accessToken: string;
    refreshToken: string;
  });
});
test.afterAll(async () => client.end());

test('employee handles task evidence and completion at 390px', async ({ page }) => {
  await page.addInitScript(
    ({ accessToken, refresh }) => {
      sessionStorage.setItem('oneday.accessToken', accessToken);
      sessionStorage.setItem('oneday.refreshToken', refresh);
      sessionStorage.setItem('oneday.accessExpiresAt', String(Date.now() + 30 * 60 * 1000));
    },
    { accessToken: token, refresh: refreshToken },
  );
  await page.goto(`/e/tasks/${task}`);
  await expect(
    page.getByRole('heading', { name: 'Confirm browser evidence', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Customer requested proof before callback.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Browser Evidence Customer', { exact: true })).toBeVisible();
  await expect(page.getByText('browser-receipt.png', { exact: true })).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-E-002/employee-task-detail-mobile.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: '关联' }).click();
  await expect(page.getByRole('status')).toContainText('证据已关联到本任务');
  await expect(page.getByText('1 项已关联', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '完成任务' }).click();
  await expect(page.getByRole('status')).toContainText('任务已完成');
  await expect(page.getByText('已完成', { exact: true })).toBeVisible();
});

test('employee task detail redirects to secure sign-in without a session', async ({ page }) => {
  await page.goto(`/e/tasks/${task}`);
  await expect(page).toHaveURL(/\/e\/login$/);
  await expect(page.getByRole('heading', { name: '员工登录' })).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-E-002/employee-task-detail-forbidden.png',
    fullPage: true,
  });
});
