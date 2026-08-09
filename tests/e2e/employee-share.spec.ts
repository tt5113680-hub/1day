import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { Client } from '../../apps/api/node_modules/pg/esm/index.mjs';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const tenant = '00000000-0000-4000-8000-000000000001';
const api = 'http://127.0.0.1:3066';
let client: Client;
let token = '';
let refreshToken = '';
let accessExpiresAt = '';

test.beforeAll(async () => {
  client = new Client({ connectionString: db });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const organization = randomUUID();
  const user = randomUUID();
  const membership = randomUUID();
  const employee = randomUUID();
  const email = `browser-share-${stamp}@example.test`;
  await client.query(
    "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,'Browser share org','team','active',null,null)",
    [organization, tenant, `bshare-${stamp}`],
  );
  await client.query(
    "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,'Mobile Share Advisor',password_hash,'active',null,null from users where email='admin@system.local'",
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
    [employee, tenant, membership, organization, `BSHARE-${stamp}`],
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
  accessExpiresAt = login.accessExpiresAt;
});

test.afterAll(async () => client.end());

test('employee generates an actual QR share code at 390px and can invalidate it', async ({
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
  await page.goto('/e/share');
  await page.getByLabel('分享场景').selectOption('campaign');
  await page.getByLabel('分享码失效时间').fill('2026-08-10T10:00');
  await page.getByRole('button', { name: '生成分享码' }).click();
  await expect(page.getByRole('status')).toContainText('分享码已生成');
  await expect(page.getByAltText('当前分享链接二维码')).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-E-005/employee-share-mobile-v3.png',
    fullPage: false,
  });
  await page.getByRole('button', { name: '立即失效' }).click();
  await expect(page.getByRole('status')).toContainText('分享码已失效');
});

test('employee share route shows recovery without a session', async ({ page }) => {
  await page.goto('/e/share');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { name: '员工登录' })).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-E-005/employee-share-forbidden-v2.png',
    fullPage: true,
  });
});
