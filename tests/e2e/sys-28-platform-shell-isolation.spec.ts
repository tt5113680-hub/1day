import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { Client } from '../../apps/api/node_modules/pg/esm/index.mjs';

const api = 'http://127.0.0.1:3344';
const platform = 'http://localhost:3345';
const systemTenant = '00000000-0000-4000-8000-000000000001';
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';

async function seedChannelOnly() {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const userId = randomUUID();
  const membershipId = randomUUID();
  const roleId = randomUUID();
  const email = `sys28-ch-${stamp}@example.local`;
  const client = new Client({ connectionString: db });
  await client.connect();
  try {
    await client.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
      [userId, email, 'SYS28 Channel'],
    );
    await client.query(
      "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [membershipId, systemTenant, userId],
    );
    await client.query(
      "insert into roles(id,tenant_id,code,name,status,created_by,updated_by) values($1,$2,$3,'Channel Operator','active',null,null)",
      [roleId, systemTenant, `channel_op_${stamp}`],
    );
    await client.query(
      'insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,$4)',
      [randomUUID(), systemTenant, membershipId, roleId],
    );
    const channelRead = await client.query(
      "select id from permissions where code='channel.read' limit 1",
    );
    const channelManage = await client.query(
      "select id from permissions where code='channel.manage' limit 1",
    );
    for (const permissionId of [channelRead.rows[0].id, channelManage.rows[0].id]) {
      await client.query(
        "insert into role_permissions(id,tenant_id,role_id,permission_id,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null)",
        [randomUUID(), systemTenant, roleId, permissionId],
      );
    }
  } finally {
    await client.end();
  }
  return email;
}

test('SYS-28 channel-only operator is redirected away from /p dashboard', async ({ page }) => {
  mkdirSync('evidence/SYS-28', { recursive: true });
  const email = await seedChannelOnly();
  const login = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'ChangeMe123!',
      tenantId: systemTenant,
    }),
  });
  expect(login.status).toBe(201);
  const tokens = (await login.json()) as { accessToken: string; refreshToken: string };

  await page.addInitScript(
    ([access, refresh]) => {
      sessionStorage.setItem('oneday.accessToken', access);
      sessionStorage.setItem('oneday.refreshToken', refresh);
      sessionStorage.setItem('oneday.accessExpiresAt', String(Date.now() + 15 * 60 * 1000));
    },
    [tokens.accessToken, tokens.refreshToken],
  );

  await page.goto(`${platform}/p/dashboard`);
  await expect(page).toHaveURL(/\/ch\/dashboard/, { timeout: 20000 });
  await expect(page.getByRole('heading', { name: '渠道经营首页' })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText(/不含平台租户开通\/冻结治理/)).toBeVisible();
  await page.screenshot({
    path: 'evidence/SYS-28/channel-only-redirect.png',
    fullPage: false,
  });
});
