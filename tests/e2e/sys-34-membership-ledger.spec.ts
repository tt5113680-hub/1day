import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { Client } from '../../apps/api/node_modules/pg/esm/index.mjs';

const api = 'http://127.0.0.1:3357';
const management = 'http://localhost:3358';
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const tenantId = '00000000-0000-4000-8000-000000000001';

async function seed() {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const customerId = randomUUID();
  const enrollmentId = randomUUID();
  const benefitId = randomUUID();
  const memberCode = `B${stamp}`.slice(0, 12).toUpperCase().padEnd(12, '0');
  const displayName = `SYS34 UI ${stamp}`;
  const client = new Client({ connectionString: db });
  await client.connect();
  try {
    const store = await client.query(
      "select id from stores where tenant_id=$1 and status='active' and deleted_at is null limit 1",
      [tenantId],
    );
    if (!store.rows[0]) throw new Error('No store in system tenant');
    const storeId = store.rows[0].id;
    await client.query(
      'insert into customers(id,tenant_id,display_name,created_by,updated_by) values($1,$2,$3,null,null)',
      [customerId, tenantId, displayName],
    );
    await client.query(
      "insert into membership_enrollments(id,tenant_id,customer_id,store_id,member_code,enrollment_status,source,joined_at,created_by,updated_by) values($1,$2,$3,$4,$5,'active','sys34-ui',now(),null,null)",
      [enrollmentId, tenantId, customerId, storeId, memberCode],
    );
    await client.query(
      "insert into store_benefits(id,tenant_id,store_id,title,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null)",
      [benefitId, tenantId, storeId, `UI Benefit ${stamp}`],
    );
  } finally {
    await client.end();
  }
  return { enrollmentId, benefitId, displayName, stamp };
}

test('SYS-34 Management membership ledger and revoke UX', async ({ page }) => {
  mkdirSync('evidence/SYS-34', { recursive: true });
  const seeded = await seed();
  const login = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@system.local',
      password: 'ChangeMe123!',
      tenantId,
    }),
  });
  expect(login.status).toBe(201);
  const { accessToken, refreshToken } = (await login.json()) as {
    accessToken: string;
    refreshToken: string;
  };

  await page.addInitScript(
    ([access, refresh]) => {
      sessionStorage.setItem('oneday.accessToken', access);
      sessionStorage.setItem('oneday.refreshToken', refresh);
      sessionStorage.setItem('oneday.accessExpiresAt', String(Date.now() + 15 * 60 * 1000));
    },
    [accessToken, refreshToken],
  );

  await page.goto(`${management}/m/memberships`);
  await expect(page.getByTestId('management-memberships')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(seeded.displayName)).toBeVisible();
  const card = page
    .locator('[data-testid^="membership-card-"]')
    .filter({ hasText: seeded.displayName });
  await expect(card).toHaveCount(1);
  await card.getByRole('button', { name: `发放：UI Benefit ${seeded.stamp}` }).click();
  await expect(page.getByRole('status')).toContainText('权益已发放', { timeout: 15000 });
  await card.getByRole('button', { name: '发放/吊销时间线' }).click();
  await expect(page.getByTestId('membership-ledger')).toBeVisible();
  const benefitRow = page
    .getByTestId('membership-balances')
    .getByRole('listitem')
    .filter({ hasText: `UI Benefit ${seeded.stamp}` });
  await expect(benefitRow).toContainText('余额 1');
  await benefitRow.getByRole('button', { name: '吊销 1 次' }).click();
  await expect(page.getByRole('status')).toContainText('权益已吊销', { timeout: 15000 });
  await expect(page.getByTestId('membership-entries').getByText('吊销').first()).toBeVisible();
  await page.screenshot({
    path: 'evidence/SYS-34/membership-ledger-timeline.png',
    fullPage: false,
  });
});
