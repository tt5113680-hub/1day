/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { URL } from 'node:url';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const systemTenant = '00000000-0000-4000-8000-000000000001';
const base = 'http://127.0.0.1:3168';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3168',
    DATABASE_URL: db,
    AUTH_TOKEN_SECRET: 'g1-winf123-channel-circle-scope',
  },
  stdio: 'ignore',
});
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function ready() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      // starting
    }
    await wait(100);
  }
  throw Error('API did not start');
}
async function login(email, tenantId = systemTenant) {
  const response = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'ChangeMe123!', tenantId }),
  });
  assert.equal(response.status, 201);
  return (await response.json()).accessToken;
}
test.after(() => api.kill());

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');
const circleController = () => read('apps/api/src/platform-business-circle.controller.ts');
const circleService = () => read('apps/api/src/platform-business-circle.service.ts');
const channelDashService = () => read('apps/api/src/channel-dashboard.service.ts');
const circleDashController = () => read('apps/api/src/circle-dashboard.controller.ts');
const chPage = () => read('apps/platform-web/app/ch/dashboard/page.tsx');
const bcPage = () => read('apps/platform-web/app/bc/dashboard/page.tsx');
const kpiTsx = () => read('apps/platform-web/app/platform-workbench-kpi.tsx');

test('G1-W∞-123: channel/circle scope-strongest backend surfaces present', () => {
  const cc = circleController();
  assert.match(cc, /networkListIds/);
  assert.match(cc, /'circle'/);
  assert.match(cc, /circle\.read/);
  assert.match(cc, /circle\.manage/);
  const cs = circleService();
  assert.match(
    cs,
    /async list\(context: OrganizationContext, circleIds: string\[\] \| null = null\)/,
  );
  assert.match(cs, /any\(\$2::uuid\[\]\)/);
  const cds = channelDashService();
  assert.match(cds, /attention: attentionQueue/);
  assert.match(cds, /attentionQueue/);
  assert.doesNotMatch(cds, /Math\.random|mockMetrics/);
  const cdc = circleDashController();
  assert.match(cdc, /scope/);
  assert.match(cdc, /restricted/);
});

test('G1-W∞-123: ch/bc dashboard scope indicator + attention queue UI present', () => {
  const kpi = kpiTsx();
  assert.match(kpi, /NetworkScopeChip/);
  assert.match(kpi, /data_scopes \/ network scope/);
  assert.match(kpi, /fail-closed/);
  const ch = chPage();
  assert.match(ch, /NetworkScopeChip/);
  assert.match(ch, /queues\.attention/);
  assert.match(ch, /渠道关注队列/);
  assert.doesNotMatch(ch, /Math\.random|mockMetrics/);
  const bc = bcPage();
  assert.match(bc, /NetworkScopeChip/);
  assert.match(bc, /data\?\.scope/);
  assert.doesNotMatch(bc, /Math\.random|mockMetrics/);
});

test('G1-W∞-123: real DB — circle list scope fail-closed + scope observability + attention queue', async () => {
  await ready();
  const client = new Client({ connectionString: db });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const circleA = randomUUID();
  const circleB = randomUUID();
  const channelA = randomUUID();
  const merchantA = randomUUID();
  const merchantB = randomUUID();
  const circleUserId = randomUUID();
  const circleMembershipId = randomUUID();
  const circleRoleId = randomUUID();
  try {
    for (const [id, slug, name] of [
      [merchantA, `w123-merchant-a-${stamp}`, `W123 Merchant A ${stamp}`],
      [merchantB, `w123-merchant-b-${stamp}`, `W123 Merchant B ${stamp}`],
    ]) {
      await client.query(
        "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
        [id, slug, name],
      );
    }
    await client.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
      [circleUserId, `circle-w123-${stamp}@example.local`, 'Circle Scoped Mgr'],
    );
    await client.query(
      "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [circleMembershipId, systemTenant, circleUserId],
    );
    await client.query(
      "insert into roles(id,tenant_id,code,name,status,created_by,updated_by) values($1,$2,$3,'Circle Manager','active',null,null)",
      [circleRoleId, systemTenant, `circle_w123_${stamp}`],
    );
    await client.query(
      'insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,$4)',
      [randomUUID(), systemTenant, circleMembershipId, circleRoleId],
    );
    const circlePerm = (
      await client.query('select id from permissions where code=$1 limit 1', ['circle.manage'])
    ).rows[0];
    assert.ok(circlePerm?.id, 'missing circle.manage permission');
    await client.query(
      "insert into role_permissions(id,tenant_id,role_id,permission_id,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null)",
      [randomUUID(), systemTenant, circleRoleId, circlePerm.id],
    );
    await client.query(
      "insert into platform_business_circles(id,tenant_id,code,name,description,status,created_by,updated_by) values($1,$2,$3,$4,'A','active',null,null),($5,$2,$6,$7,'B','active',null,null)",
      [
        circleA,
        systemTenant,
        `circ_a_${stamp}`,
        `W123 Circle A ${stamp}`,
        circleB,
        `circ_b_${stamp}`,
        `W123 Circle B ${stamp}`,
      ],
    );
    await client.query(
      "insert into platform_business_circle_merchants(id,tenant_id,circle_id,merchant_tenant_id,benefits,recommendation_reason,invitation_status,circle_approval_status,approval_status,display_config,status,created_by,updated_by) values($1,$2,$3,$4,$5,$6,'accepted','approved','approved',$7,'active',null,null),($8,$2,$9,$10,$5,$6,'accepted','approved','approved',$7,'active',null,null)",
      [
        randomUUID(),
        systemTenant,
        circleA,
        merchantA,
        JSON.stringify(['benefit']),
        'reason',
        JSON.stringify({ visible: true }),
        randomUUID(),
        circleB,
        merchantB,
      ],
    );
    await client.query(
      "insert into platform_channels(id,tenant_id,code,name,onboarding_status,service_status,status,created_by,updated_by) values($1,$2,$3,$4,'active','active','active',null,null)",
      [channelA, systemTenant, `ch_a_${stamp}`, `W123 Channel A ${stamp}`],
    );
    await client.query(
      "insert into data_scopes(id,tenant_id,membership_id,scope_type,scope_value,status,created_by,updated_by) values($1,$2,$3,'circle',$4,'active',null,null)",
      [randomUUID(), systemTenant, circleMembershipId, circleA],
    );
  } finally {
    await client.end();
  }

  const adminToken = await login('admin@system.local', systemTenant);
  const circleToken = await login(`circle-w123-${stamp}@example.local`, systemTenant);
  const hAdmin = { authorization: `Bearer ${adminToken}`, 'x-request-id': randomUUID() };
  const hCircle = { authorization: `Bearer ${circleToken}`, 'x-request-id': randomUUID() };

  // 1. Admin sees BOTH circles (unrestricted scope)
  const adminList = await fetch(`${base}/api/v1/platform/business-circles`, { headers: hAdmin });
  assert.equal(adminList.status, 200);
  const adminData = (await adminList.json()).data;
  assert.ok(adminData.circles.some((c) => c.id === circleA));
  assert.ok(adminData.circles.some((c) => c.id === circleB));

  // 2. Circle-scoped operator sees ONLY their scoped circle (fail-closed scope filter — the gap fix)
  const circleList = await fetch(`${base}/api/v1/platform/business-circles`, { headers: hCircle });
  assert.equal(circleList.status, 200);
  const circleData = (await circleList.json()).data;
  assert.ok(circleData.circles.some((c) => c.id === circleA));
  assert.equal(
    circleData.circles.some((c) => c.id === circleB),
    false,
    'circle-scoped operator must not see out-of-scope circle (no leak)',
  );

  // 3. circle dashboard scope observability (restricted=true, count=1)
  const circleDash = await fetch(`${base}/api/v1/circle/dashboard`, { headers: hCircle });
  assert.equal(circleDash.status, 200);
  const circleDashData = (await circleDash.json()).data;
  assert.equal(circleDashData.scope.type, 'circle');
  assert.equal(circleDashData.scope.restricted, true);
  assert.equal(circleDashData.scope.count, 1);
  assert.deepEqual(
    circleDashData.circles.map((c) => c.id),
    [circleA],
  );

  // 4. Admin circle dashboard unrestricted scope observability
  const adminCircleDash = await fetch(`${base}/api/v1/circle/dashboard`, { headers: hAdmin });
  assert.equal(adminCircleDash.status, 200);
  const adminCircleDashData = (await adminCircleDash.json()).data;
  assert.equal(adminCircleDashData.scope.restricted, false);
  assert.equal(adminCircleDashData.scope.count, 0);

  // 5. Unauthorized -> 401
  assert.equal(
    (await fetch(`${base}/api/v1/circle/dashboard`, { headers: { 'x-request-id': randomUUID() } }))
      .status,
    401,
  );
});
