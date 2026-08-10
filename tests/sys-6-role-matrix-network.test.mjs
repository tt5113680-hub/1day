/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';
import {
  CHANNEL_MENU_CATALOG,
  CIRCLE_MENU_CATALOG,
  PLATFORM_MENU_CATALOG,
  filterMenuCatalog,
} from '../packages/contracts/dist/index.js';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const base = 'http://127.0.0.1:3278';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const systemTenantId = '00000000-0000-4000-8000-000000000001';

const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3278',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'sys-6-role-matrix-network',
  },
  stdio: 'ignore',
});

async function ready() {
  for (let i = 0; i < 60; i += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      // starting
    }
    await wait(100);
  }
  throw new Error('API not ready');
}

async function login(email, password, tenantId) {
  const response = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, tenantId }),
  });
  assert.equal(response.status, 201);
  return (await response.json()).accessToken;
}

test.after(() => api.kill());

test('SYS-6 Role matrix E2E slice: Channel / Circle / Platform packages', async () => {
  await ready();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const channelUserId = randomUUID();
  const circleUserId = randomUUID();
  const platformUserId = randomUUID();
  const channelMembershipId = randomUUID();
  const circleMembershipId = randomUUID();
  const platformMembershipId = randomUUID();
  const channelRoleId = randomUUID();
  const circleRoleId = randomUUID();
  const platformRoleId = randomUUID();
  const channelA = randomUUID();
  const channelB = randomUUID();
  const circleA = randomUUID();
  const circleB = randomUUID();
  const merchantTenantA = randomUUID();
  const merchantTenantB = randomUUID();
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    for (const [id, slug, name] of [
      [merchantTenantA, `sys6-rm-ch-a-${stamp}`, `SYS6 CH A ${stamp}`],
      [merchantTenantB, `sys6-rm-ch-b-${stamp}`, `SYS6 CH B ${stamp}`],
    ]) {
      await client.query(
        "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
        [id, slug, name],
      );
    }
    for (const [id, email, name] of [
      [channelUserId, `channel-rm-${stamp}@example.local`, 'Channel Op'],
      [circleUserId, `circle-rm-${stamp}@example.local`, 'Circle Mgr'],
      [platformUserId, `platform-rm-${stamp}@example.local`, 'Platform Admin'],
    ]) {
      await client.query(
        "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
        [id, email, name],
      );
    }
    await client.query(
      "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null),($4,$2,$5,'active',null,null),($6,$2,$7,'active',null,null)",
      [
        channelMembershipId,
        systemTenantId,
        channelUserId,
        circleMembershipId,
        circleUserId,
        platformMembershipId,
        platformUserId,
      ],
    );
    await client.query(
      "insert into roles(id,tenant_id,code,name,status,created_by,updated_by) values($1,$2,$3,'Channel Operator','active',null,null),($4,$2,$5,'Circle Manager','active',null,null),($6,$2,$7,'Platform Admin','active',null,null)",
      [
        channelRoleId,
        systemTenantId,
        `channel_op_${stamp}`,
        circleRoleId,
        `circle_mgr_${stamp}`,
        platformRoleId,
        `platform_admin_${stamp}`,
      ],
    );
    await client.query(
      'insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,$4),($5,$2,$6,$7),($8,$2,$9,$10)',
      [
        randomUUID(),
        systemTenantId,
        channelMembershipId,
        channelRoleId,
        randomUUID(),
        circleMembershipId,
        circleRoleId,
        randomUUID(),
        platformMembershipId,
        platformRoleId,
      ],
    );
    const codes = {};
    for (const code of [
      'channel.read',
      'channel.manage',
      'circle.manage',
      'platform.read',
      'platform.manage',
    ]) {
      const row = (await client.query('select id from permissions where code=$1 limit 1', [code]))
        .rows[0];
      assert.ok(row?.id, `missing permission ${code}`);
      codes[code] = row.id;
    }
    for (const code of ['channel.read', 'channel.manage']) {
      await client.query(
        "insert into role_permissions(id,tenant_id,role_id,permission_id,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null)",
        [randomUUID(), systemTenantId, channelRoleId, codes[code]],
      );
    }
    await client.query(
      "insert into role_permissions(id,tenant_id,role_id,permission_id,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null)",
      [randomUUID(), systemTenantId, circleRoleId, codes['circle.manage']],
    );
    for (const code of [
      'platform.read',
      'platform.manage',
      'channel.read',
      'channel.manage',
      'circle.manage',
    ]) {
      await client.query(
        "insert into role_permissions(id,tenant_id,role_id,permission_id,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null)",
        [randomUUID(), systemTenantId, platformRoleId, codes[code]],
      );
    }
    await client.query(
      "insert into platform_channels(id,tenant_id,code,name,onboarding_status,service_status,status,created_by,updated_by) values($1,$2,$3,$4,'active','active','active',null,null),($5,$2,$6,$7,'active','active','active',null,null)",
      [
        channelA,
        systemTenantId,
        `ch_a_${stamp}`,
        `Channel A ${stamp}`,
        channelB,
        `ch_b_${stamp}`,
        `Channel B ${stamp}`,
      ],
    );
    await client.query(
      "insert into platform_channel_merchants(id,tenant_id,channel_id,merchant_tenant_id,onboarding_status,service_status,status,created_by,updated_by) values($1,$2,$3,$4,'active','active','active',null,null),($5,$2,$6,$7,'active','active','active',null,null)",
      [
        randomUUID(),
        systemTenantId,
        channelA,
        merchantTenantA,
        randomUUID(),
        channelB,
        merchantTenantB,
      ],
    );
    await client.query(
      "insert into platform_business_circles(id,tenant_id,code,name,description,status,created_by,updated_by) values($1,$2,$3,$4,'A','active',null,null),($5,$2,$6,$7,'B','active',null,null)",
      [
        circleA,
        systemTenantId,
        `ci_a_${stamp}`,
        `Circle A ${stamp}`,
        circleB,
        `ci_b_${stamp}`,
        `Circle B ${stamp}`,
      ],
    );
    await client.query(
      "insert into platform_business_circle_merchants(id,tenant_id,circle_id,merchant_tenant_id,benefits,recommendation_reason,invitation_status,circle_approval_status,approval_status,display_config,status,created_by,updated_by) values($1,$2,$3,$4,$5,$6,'accepted','approved','approved',$7,'active',null,null),($8,$2,$9,$10,$5,$6,'accepted','approved','approved',$7,'active',null,null)",
      [
        randomUUID(),
        systemTenantId,
        circleA,
        merchantTenantA,
        JSON.stringify(['benefit']),
        'reason',
        JSON.stringify({ visible: true }),
        randomUUID(),
        circleB,
        merchantTenantB,
      ],
    );
    await client.query(
      "insert into data_scopes(id,tenant_id,membership_id,scope_type,scope_value,status,created_by,updated_by) values($1,$2,$3,'channel',$4,'active',null,null),($5,$2,$6,'circle',$7,'active',null,null)",
      [
        randomUUID(),
        systemTenantId,
        channelMembershipId,
        channelA,
        randomUUID(),
        circleMembershipId,
        circleA,
      ],
    );
  } finally {
    await client.end();
  }

  const channelToken = await login(`channel-rm-${stamp}@example.local`, 'ChangeMe123!', systemTenantId);
  const circleToken = await login(`circle-rm-${stamp}@example.local`, 'ChangeMe123!', systemTenantId);
  const platformToken = await login(
    `platform-rm-${stamp}@example.local`,
    'ChangeMe123!',
    systemTenantId,
  );
  const headers = (token) => ({
    authorization: `Bearer ${token}`,
    'x-request-id': randomUUID(),
    'content-type': 'application/json',
  });

  const channelMenu = await fetch(`${base}/api/v1/me/menu?product=channel`, {
    headers: headers(channelToken),
  });
  assert.equal(channelMenu.status, 200);
  const channelMenuData = await channelMenu.json();
  assert.deepEqual(
    channelMenuData.data.items.map((item) => item.key),
    filterMenuCatalog(CHANNEL_MENU_CATALOG, ['channel.read', 'channel.manage']).map(
      (item) => item.key,
    ),
  );
  assert.deepEqual(
    channelMenuData.data.availableProducts.map((item) => item.product),
    ['channel'],
  );
  assert.deepEqual(
    channelMenuData.data.scopes.map((scope) => scope.id),
    [channelA],
  );
  assert.equal(channelMenuData.data.homeHref, '/ch/dashboard');

  const channelPlatformMenu = await fetch(`${base}/api/v1/me/menu?product=platform`, {
    headers: headers(channelToken),
  });
  assert.equal(channelPlatformMenu.status, 200);
  assert.deepEqual((await channelPlatformMenu.json()).data.items.map((item) => item.key), []);

  const channelDash = await fetch(`${base}/api/v1/channel/dashboard`, {
    headers: headers(channelToken),
  });
  assert.equal(channelDash.status, 200);
  const channelData = (await channelDash.json()).data;
  assert.equal(channelData.metrics.merchant_count, 1);
  assert.deepEqual(
    channelData.merchants.map((row) => row.channelId),
    [channelA],
  );

  assert.equal(
    (await fetch(`${base}/api/v1/platform/tenants`, { headers: headers(channelToken) })).status,
    403,
  );
  assert.equal(
    (await fetch(`${base}/api/v1/circle/dashboard`, { headers: headers(channelToken) })).status,
    403,
  );
  assert.equal(
    (
      await fetch(`${base}/api/v1/platform/tenants/${merchantTenantA}`, {
        method: 'PUT',
        headers: { ...headers(channelToken), 'idempotency-key': randomUUID() },
        body: JSON.stringify({ status: 'suspended' }),
      })
    ).status,
    403,
  );

  const circleMenu = await fetch(`${base}/api/v1/me/menu?product=circle`, {
    headers: headers(circleToken),
  });
  assert.equal(circleMenu.status, 200);
  const circleMenuData = await circleMenu.json();
  assert.deepEqual(
    circleMenuData.data.items.map((item) => item.key),
    filterMenuCatalog(CIRCLE_MENU_CATALOG, ['circle.manage']).map((item) => item.key),
  );
  assert.deepEqual(
    circleMenuData.data.availableProducts.map((item) => item.product),
    ['circle'],
  );
  assert.deepEqual(
    circleMenuData.data.scopes.map((scope) => scope.id),
    [circleA],
  );

  const circleDash = await fetch(`${base}/api/v1/circle/dashboard`, {
    headers: headers(circleToken),
  });
  assert.equal(circleDash.status, 200);
  assert.deepEqual(
    (await circleDash.json()).data.circles.map((row) => row.id),
    [circleA],
  );
  assert.equal(
    (await fetch(`${base}/api/v1/platform/tenants`, { headers: headers(circleToken) })).status,
    403,
  );
  assert.equal(
    (await fetch(`${base}/api/v1/channel/dashboard`, { headers: headers(circleToken) })).status,
    403,
  );
  assert.equal(
    (
      await fetch(`${base}/api/v1/circle/merchants/invitations`, {
        method: 'POST',
        headers: { ...headers(circleToken), 'idempotency-key': randomUUID() },
        body: JSON.stringify({
          circleId: circleB,
          merchantTenantId: merchantTenantB,
          benefits: ['x'],
          invitationNote: 'out of scope',
          displayConfig: { visible: true, sortOrder: 0 },
        }),
      })
    ).status,
    403,
  );

  const platformMenu = await fetch(`${base}/api/v1/me/menu?product=platform`, {
    headers: headers(platformToken),
  });
  assert.equal(platformMenu.status, 200);
  const platformMenuData = await platformMenu.json();
  assert.deepEqual(
    platformMenuData.data.items.map((item) => item.key),
    filterMenuCatalog(PLATFORM_MENU_CATALOG, [
      'platform.read',
      'platform.manage',
      'channel.read',
      'channel.manage',
      'circle.manage',
    ]).map((item) => item.key),
  );
  assert.ok(
    platformMenuData.data.availableProducts.map((item) => item.product).includes('platform'),
  );
  assert.ok(
    platformMenuData.data.availableProducts.map((item) => item.product).includes('channel'),
  );
  assert.ok(platformMenuData.data.availableProducts.map((item) => item.product).includes('circle'));

  assert.equal(
    (await fetch(`${base}/api/v1/platform/tenants`, { headers: headers(platformToken) })).status,
    200,
  );
  const adminChannel = await fetch(`${base}/api/v1/channel/dashboard`, {
    headers: headers(platformToken),
  });
  assert.equal(adminChannel.status, 200);
  const adminChannelData = (await adminChannel.json()).data;
  assert.ok(adminChannelData.merchants.some((row) => row.channelId === channelA));
  assert.ok(adminChannelData.merchants.some((row) => row.channelId === channelB));
});
