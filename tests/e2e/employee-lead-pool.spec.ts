import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { Client } from '../../apps/api/node_modules/pg/esm/index.mjs';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const tenant = '00000000-0000-4000-8000-000000000001';
const api = 'http://127.0.0.1:3069';
let client: Client;
let token = '';
let availableName = '';
let assignedName = '';
let ownerEmployee = '';

test.beforeAll(async () => {
  client = new Client({ connectionString: db });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const organization = randomUUID();
  const user = randomUUID();
  const membership = randomUUID();
  const employee = randomUUID();
  const peerUser = randomUUID();
  const peerMembership = randomUUID();
  const peerEmployee = randomUUID();
  const customerOne = randomUUID();
  const customerTwo = randomUUID();
  const leadOne = randomUUID();
  const leadTwo = randomUUID();
  const email = `browser-lead-${stamp}@example.test`;
  ownerEmployee = employee;
  availableName = `Mobile available lead ${stamp}`;
  assignedName = `Mobile assigned lead ${stamp}`;
  await client.query(
    "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,'Browser lead org','team','active',null,null)",
    [organization, tenant, `blead-${stamp}`],
  );
  for (const [id, mail, name, member, staff, code] of [
    [user, email, 'Mobile Lead Owner', membership, employee, `BLEAD-${stamp}`],
    [
      peerUser,
      `browser-lead-peer-${stamp}@example.test`,
      'Mobile Lead Peer',
      peerMembership,
      peerEmployee,
      `BPEER-${stamp}`,
    ],
  ]) {
    await client.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
      [id, mail, name],
    );
    await client.query(
      "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [member, tenant, id],
    );
    await client.query(
      "insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,'00000000-0000-4000-8000-000000000004')",
      [randomUUID(), tenant, member],
    );
    await client.query(
      "insert into employees(id,tenant_id,membership_id,organization_id,employee_code,title,status,created_by,updated_by) values($1,$2,$3,$4,$5,'Advisor','active',null,null)",
      [staff, tenant, member, organization, code],
    );
  }
  await client.query(
    "insert into customers(id,tenant_id,display_name,status,created_by,updated_by) values($1,$2,$3,'active',null,null),($4,$2,$5,'active',null,null)",
    [customerOne, tenant, availableName, customerTwo, assignedName],
  );
  await client.query(
    "insert into employee_lead_pool_entries(id,tenant_id,customer_id,source_type,priority,status,assignee_employee_id,claimed_at,created_by,updated_by) values($1,$2,$3,'campaign','high','available',null,null,null,null),($4,$2,$5,'store','normal','claimed',$6,now(),null,null)",
    [leadOne, tenant, customerOne, leadTwo, customerTwo, peerEmployee],
  );
  const response = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'ChangeMe123!', tenantId: tenant }),
  });
  expect(response.status).toBe(201);
  token = (await response.json()).accessToken;
});

test.afterAll(async () => client.end());

test('employee can claim, allocate and convert live leads at 390px', async ({ page }) => {
  await page.addInitScript((value) => sessionStorage.setItem('oneday.accessToken', value), token);
  await page.goto('/e/leads');
  await expect(page.locator('main > header h1')).toBeVisible();
  await expect(page.getByText(availableName)).toBeVisible();
  const availableCard = page.locator('article', { hasText: availableName });
  await availableCard.locator('button').click();
  await expect(availableCard.locator('button')).toHaveCount(2);
  const assignedCard = page.locator('article', { hasText: assignedName });
  await assignedCard.locator('select').selectOption(ownerEmployee);
  await expect(assignedCard.locator('select')).toHaveCount(0);
  await page.screenshot({
    path: 'evidence/PAGE-E-006/employee-lead-pool-mobile.png',
    fullPage: false,
  });
  await assignedCard.locator('button').first().click();
  await expect(assignedCard.locator('button')).toHaveCount(0);
});

test('employee lead route renders login recovery without a session', async ({ page }) => {
  await page.goto('/e/leads');
  await expect(page.locator('main h1')).toBeVisible();
  await page.screenshot({
    path: 'evidence/PAGE-E-006/employee-lead-pool-forbidden.png',
    fullPage: true,
  });
});
