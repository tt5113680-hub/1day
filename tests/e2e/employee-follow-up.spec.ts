import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { Client } from '../../apps/api/node_modules/pg/esm/index.mjs';
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test',
  tenant = '00000000-0000-4000-8000-000000000001',
  api = 'http://127.0.0.1:3063';
let client: Client,
  token = '',
  refreshToken = '',
  accessExpiresAt = '',
  task = '';
test.beforeAll(async () => {
  client = new Client({ connectionString: db });
  await client.connect();
  const s = `${Date.now()}${Math.floor(Math.random() * 1000)}`,
    org = randomUUID(),
    u = randomUUID(),
    m = randomUUID(),
    e = randomUUID(),
    c = randomUUID(),
    email = `browser-follow-${s}@example.test`;
  task = randomUUID();
  await client.query(
    "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,'Browser follow-up org','team','active',null,null)",
    [org, tenant, `bfu-${s}`],
  );
  await client.query(
    "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,'Mobile Follow-up Advisor',password_hash,'active',null,null from users where email='admin@system.local'",
    [u, email],
  );
  await client.query(
    "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
    [m, tenant, u],
  );
  await client.query(
    "insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,'00000000-0000-4000-8000-000000000004')",
    [randomUUID(), tenant, m],
  );
  await client.query(
    "insert into employees(id,tenant_id,membership_id,organization_id,employee_code,title,status,created_by,updated_by) values($1,$2,$3,$4,$5,'Advisor','active',null,null)",
    [e, tenant, m, org, `BFU-${s}`],
  );
  await client.query(
    "insert into customers(id,tenant_id,display_name,status,created_by,updated_by) values($1,$2,'Follow-up Browser Customer','active',null,null)",
    [c, tenant],
  );
  await client.query(
    "insert into tasks(id,tenant_id,customer_id,assignee_employee_id,title,due_at,status,created_by,updated_by) values($1,$2,$3,$4,'Browser follow-up task',now()+interval '1 hour','open',null,null)",
    [task, tenant, c, e],
  );
  const r = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'ChangeMe123!', tenantId: tenant }),
  });
  expect(r.status).toBe(201);
  const login = await r.json();
  token = login.accessToken;
  refreshToken = login.refreshToken;
  accessExpiresAt = login.expiresAt;
});
test.afterAll(async () => client.end());
test('employee records a real follow-up at 390px', async ({ page }) => {
  await page.addInitScript(
    ({ accessToken, refreshToken, accessExpiresAt }) => {
      sessionStorage.setItem('oneday.accessToken', accessToken);
      sessionStorage.setItem('oneday.refreshToken', refreshToken);
      sessionStorage.setItem('oneday.accessExpiresAt', accessExpiresAt);
    },
    { accessToken: token, refreshToken, accessExpiresAt },
  );
  await page.goto(`/e/tasks/${task}/follow-up`);
  await page.getByLabel('原始文字记录').fill('Customer confirmed Friday visit.');
  await page.getByLabel('语音转写').fill('Voice note transcription.');
  await page.getByLabel('跟进总结').fill('Prepare the Friday visit.');
  await page.getByLabel('下一任务标题').fill('Prepare Friday visit');
  await page.getByLabel('下一任务时间').fill('2026-08-10T10:00');
  await page.locator('main').screenshot({
    path: 'evidence/PAGE-E-004/employee-follow-up-mobile-v4.png',
  });
  await page.getByRole('button', { name: '保存跟进' }).click();
  await expect(page.getByRole('status')).toContainText('跟进已保存');
  await expect(page.getByText('Prepare the Friday visit.', { exact: true })).toBeVisible();
});
test('employee follow-up shows recovery without session', async ({ page }) => {
  await page.goto(`/e/tasks/${task}/follow-up`);
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { name: '员工登录' })).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-E-004/employee-follow-up-forbidden-v2.png',
    fullPage: true,
  });
});
