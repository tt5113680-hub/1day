/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const systemTenantId = '00000000-0000-4000-8000-000000000001';
const base = 'http://127.0.0.1:3269';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3269',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'sys-6-network-packs',
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

test('SYS-6: channel/circle network packs scope list and writes', async () => {
  await ready();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const channelUserId = randomUUID();
  const circleUserId = randomUUID();
  const channelMembershipId = randomUUID();
  const circleMembershipId = randomUUID();
  const channelRoleId = randomUUID();
  const circleRoleId = randomUUID();
  const channelA = randomUUID();
  const channelB = randomUUID();
  const circleA = randomUUID();
  const circleB = randomUUID();
  const merchantA = randomUUID();
  const merchantB = randomUUID();
  const membershipA = randomUUID();
  const membershipB = randomUUID();
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    for (const [id, email, name] of [
      [channelUserId, `channel-pack-${stamp}@example.local`, 'Channel Op'],
      [circleUserId, `circle-pack-${stamp}@example.local`, 'Circle Op'],
    ]) {
      await client.query(
        "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
        [id, email, name],
      );
    }
    await client.query(
      "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null),($4,$2,$5,'active',null,null)",
      [channelMembershipId, systemTenantId, channelUserId, circleMembershipId, circleUserId],
    );
    await client.query(
      "insert into roles(id,tenant_id,code,name,status,created_by,updated_by) values($1,$2,$3,'Channel Operator','active',null,null),($4,$2,$5,'Circle Manager','active',null,null)",
      [
        channelRoleId,
        systemTenantId,
        `channel_op_${stamp}`,
        circleRoleId,
        `circle_mgr_${stamp}`,
      ],
    );
    await client.query(
      'insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,$4),($5,$2,$6,$7)',
      [
        randomUUID(),
        systemTenantId,
        channelMembershipId,
        channelRoleId,
        randomUUID(),
        circleMembershipId,
        circleRoleId,
      ],
    );
    const channelRead = (
      await client.query("select id from permissions where code='channel.read' limit 1")
    ).rows[0].id;
    const circleManage = (
      await client.query("select id from permissions where code='circle.manage' limit 1")
    ).rows[0].id;
    await client.query(
      "insert into role_permissions(id,tenant_id,role_id,permission_id,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null)",
      [randomUUID(), systemTenantId, channelRoleId, channelRead],
    );
    await client.query(
      "insert into role_permissions(id,tenant_id,role_id,permission_id,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null)",
      [randomUUID(), systemTenantId, circleRoleId, circleManage],
    );
    await client.query(
      "insert into platform_channels(id,tenant_id,code,name,onboarding_status,service_status,status,created_by,updated_by) values($1,$2,$3,$4,'active','active','active',null,null),($5,$2,$6,$7,'active','active','active',null,null)",
      [
        channelA,
        systemTenantId,
        `CHA-${stamp}`,
        `Channel A ${stamp}`,
        channelB,
        `CHB-${stamp}`,
        `Channel B ${stamp}`,
      ],
    );
    await client.query(
      "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,$3,'active',null,null),($4,$5,$6,'active',null,null)",
      [
        merchantA,
        `net-a-${stamp}`,
        `Merchant A ${stamp}`,
        merchantB,
        `net-b-${stamp}`,
        `Merchant B ${stamp}`,
      ],
    );
    await client.query(
      "insert into platform_channel_merchants(id,tenant_id,channel_id,merchant_tenant_id,onboarding_status,service_status,status,created_by,updated_by) values($1,$2,$3,$4,'active','active','active',null,null),($5,$2,$6,$7,'active','active','active',null,null)",
      [
        randomUUID(),
        systemTenantId,
        channelA,
        merchantA,
        randomUUID(),
        channelB,
        merchantB,
      ],
    );
    await client.query(
      "insert into platform_business_circles(id,tenant_id,code,name,description,status,created_by,updated_by) values($1,$2,$3,$4,'A', 'active',null,null),($5,$2,$6,$7,'B','active',null,null)",
      [
        circleA,
        systemTenantId,
        `CIA-${stamp}`,
        `Circle A ${stamp}`,
        circleB,
        `CIB-${stamp}`,
        `Circle B ${stamp}`,
      ],
    );
    await client.query(
      "insert into platform_business_circle_merchants(id,tenant_id,circle_id,merchant_tenant_id,benefits,recommendation_reason,invitation_status,circle_approval_status,approval_status,display_config,status,created_by,updated_by) values($1,$2,$3,$4,$5,$6,'accepted','approved','approved',$7,'active',null,null),($8,$2,$9,$10,$5,$6,'accepted','approved','approved',$7,'active',null,null)",
      [
        membershipA,
        systemTenantId,
        circleA,
        merchantA,
        JSON.stringify(['benefit']),
        'seed',
        JSON.stringify({ visible: true, sortOrder: 1 }),
        membershipB,
        circleB,
        merchantB,
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

  const channelToken = await login(
    `channel-pack-${stamp}@example.local`,
    'ChangeMe123!',
    systemTenantId,
  );
  const circleToken = await login(
    `circle-pack-${stamp}@example.local`,
    'ChangeMe123!',
    systemTenantId,
  );
  const adminToken = await login('admin@system.local', 'ChangeMe123!', systemTenantId);

  const channelDash = await fetch(`${base}/api/v1/channel/dashboard`, {
    headers: {
      authorization: `Bearer ${channelToken}`,
      'x-request-id': randomUUID(),
    },
  });
  assert.equal(channelDash.status, 200);
  const channelData = (await channelDash.json()).data;
  assert.equal(channelData.metrics.merchant_count, 1);
  assert.deepEqual(
    channelData.merchants.map((row) => row.channelId),
    [channelA],
  );

  const adminChannelDash = await fetch(`${base}/api/v1/channel/dashboard`, {
    headers: {
      authorization: `Bearer ${adminToken}`,
      'x-request-id': randomUUID(),
    },
  });
  assert.equal(adminChannelDash.status, 200);
  const adminChannel = (await adminChannelDash.json()).data;
  assert.ok(adminChannel.merchants.some((row) => row.channelId === channelA));
  assert.ok(adminChannel.merchants.some((row) => row.channelId === channelB));

  const circleDash = await fetch(`${base}/api/v1/circle/dashboard`, {
    headers: {
      authorization: `Bearer ${circleToken}`,
      'x-request-id': randomUUID(),
    },
  });
  assert.equal(circleDash.status, 200);
  const circleData = (await circleDash.json()).data;
  assert.equal(circleData.metrics.circle_count, 1);
  assert.deepEqual(
    circleData.circles.map((row) => row.id),
    [circleA],
  );

  const circleList = await fetch(`${base}/api/v1/circle/merchants`, {
    headers: {
      authorization: `Bearer ${circleToken}`,
      'x-request-id': randomUUID(),
    },
  });
  assert.equal(circleList.status, 200);
  const listed = (await circleList.json()).data.members;
  assert.deepEqual(
    listed.map((row) => row.circleId),
    [circleA],
  );

  const inviteDenied = await fetch(`${base}/api/v1/circle/merchants/invitations`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${circleToken}`,
      'x-request-id': randomUUID(),
      'idempotency-key': randomUUID(),
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      circleId: circleB,
      merchantTenantId: merchantA,
      benefits: ['x'],
      invitationNote: 'out of scope',
      displayConfig: { visible: true, sortOrder: 0 },
    }),
  });
  assert.equal(inviteDenied.status, 403);

  const channelMenu = await fetch(`${base}/api/v1/me/menu?product=channel`, {
    headers: {
      authorization: `Bearer ${channelToken}`,
      'x-request-id': randomUUID(),
    },
  });
  assert.equal(channelMenu.status, 200);
  const channelMenuData = (await channelMenu.json()).data;
  assert.match(channelMenuData.context, /Channel A/);
  assert.deepEqual(
    channelMenuData.scopes.map((scope) => scope.id),
    [channelA],
  );

  const circleMenu = await fetch(`${base}/api/v1/me/menu?product=circle`, {
    headers: {
      authorization: `Bearer ${circleToken}`,
      'x-request-id': randomUUID(),
    },
  });
  assert.equal(circleMenu.status, 200);
  const circleMenuData = (await circleMenu.json()).data;
  assert.match(circleMenuData.context, /Circle A/);
  assert.deepEqual(
    circleMenuData.scopes.map((scope) => scope.id),
    [circleA],
  );
});
