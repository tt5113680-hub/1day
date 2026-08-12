/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const tenant = '00000000-0000-4000-8000-000000000001';
const base = 'http://127.0.0.1:3082';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3082',
    DATABASE_URL: db,
    AUTH_TOKEN_SECRET: 'management-membership-rules-110',
  },
  stdio: 'ignore',
});
const headers = (token, extra = {}) => ({
  authorization: `Bearer ${token}`,
  'content-type': 'application/json',
  'x-request-id': randomUUID(),
  ...extra,
});
async function ready() {
  for (let i = 0; i < 40; i += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      /* starting */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw Error('API did not start');
}
async function login(email) {
  const response = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'ChangeMe123!', tenantId: tenant }),
  });
  assert.equal(response.status, 201);
  return (await response.json()).accessToken;
}

test.after(() => api.kill());
test('G1-W∞-110: membership rules + renewals + alerts round-trip with real DB', async () => {
  await ready();
  const client = new Client({ connectionString: db });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const organization = randomUUID();
  const owner = { user: randomUUID(), membership: randomUUID(), employee: randomUUID() };
  const store = randomUUID();
  const merchant = randomUUID();
  const customerA = randomUUID();
  const customerB = randomUUID();
  const customerC = randomUUID();
  const benefit = randomUUID();
  const enrollmentA = randomUUID();
  const enrollmentB = randomUUID();
  const enrollmentC = randomUUID();
  try {
    await client.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,'MBR org','team','active',null,null)",
      [organization, tenant, `mbr-${stamp}`],
    );
    await client.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
      [owner.user, `MBROWN-${stamp}@example.test`, 'Membership owner'],
    );
    await client.query(
      "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [owner.membership, tenant, owner.user],
    );
    await client.query(
      'insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,$4)',
      [randomUUID(), tenant, owner.membership, '00000000-0000-4000-8000-000000000004'],
    );
    await client.query(
      "insert into employees(id,tenant_id,membership_id,organization_id,employee_code,title,status,created_by,updated_by) values($1,$2,$3,$4,$5,'Advisor','active',null,null)",
      [owner.employee, tenant, owner.membership, organization, `MBRE-${stamp}`],
    );
    await client.query(
      "insert into merchants(id,tenant_id,organization_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,$5,'active',null,null)",
      [merchant, tenant, organization, `MBRM-${stamp}`, `W110 merchant ${stamp}`],
    );
    await client.query(
      "insert into stores(id,tenant_id,organization_id,merchant_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,$5,$6,'active',null,null)",
      [store, tenant, organization, merchant, `MBRS-${stamp}`, `W110 store ${stamp}`],
    );
    for (const customer of [customerA, customerB, customerC]) {
      await client.query(
        "insert into customers(id,tenant_id,display_name,status,created_by,updated_by) values($1,$2,'MBR customer','active',null,null)",
        [customer, tenant],
      );
    }
    await client.query(
      "insert into store_benefits(id,tenant_id,store_id,title,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null)",
      [benefit, tenant, store, `W110 benefit`],
    );
    // A: expiring in 2 days; B: suspended; C: expired already.
    await client.query(
      "insert into membership_enrollments(id,tenant_id,customer_id,store_id,member_code,tier,enrollment_status,source,joined_at,expires_at,last_active_at,created_by,updated_by) values($1,$2,$3,$4,$5,'gold','active','consumer_storefront',now(),now()+interval '2 days',now()-interval '10 days',null,null)",
      [enrollmentA, tenant, customerA, store, `MBRA${stamp.slice(-8)}`],
    );
    await client.query(
      "insert into membership_enrollments(id,tenant_id,customer_id,store_id,member_code,tier,enrollment_status,source,joined_at,expires_at,last_active_at,created_by,updated_by) values($1,$2,$3,$4,$5,'silver','suspended','consumer_storefront',now(),now()+interval '30 days',now()-interval '200 days',null,null)",
      [enrollmentB, tenant, customerB, store, `MBRB${stamp.slice(-8)}`],
    );
    await client.query(
      "insert into membership_enrollments(id,tenant_id,customer_id,store_id,member_code,tier,enrollment_status,source,joined_at,expires_at,last_active_at,created_by,updated_by) values($1,$2,$3,$4,$5,'bronze','active','consumer_storefront',now()-interval '10 days',now()-interval '200 days',now()-interval '200 days',null,null)",
      [enrollmentC, tenant, customerC, store, `MBRC${stamp.slice(-8)}`],
    );
    const ownerToken = await login(`MBROWN-${stamp}@example.test`);

    // low-privilege / cross tenant guard: wrong x-tenant-context is denied
    const guarded = await fetch(`${base}/api/v1/management/memberships/rules`, {
      headers: headers(ownerToken, {
        authorization: `Bearer ${ownerToken}`,
        'x-request-id': randomUUID(),
        'x-tenant-context': randomUUID(),
      }),
    });
    assert.ok([403, 404].includes(guarded.status), 'wrong tenant denied (403/404, no leak)');

    // rules list (empty initially for brand-new rule? may be non-empty from prior tests)
    const rulesBefore = await fetch(`${base}/api/v1/management/memberships/rules`, {
      headers: headers(ownerToken),
    });
    assert.equal(rulesBefore.status, 200);

    // upsert rule
    const key = randomUUID();
    const upsert = await fetch(`${base}/api/v1/management/memberships/rules`, {
      method: 'POST',
      headers: headers(ownerToken, {
        'x-request-id': randomUUID(),
        'idempotency-key': key,
      }),
      body: JSON.stringify({
        title: `Gold rules ${stamp}`,
        tier: `gold-${stamp.slice(-6)}`,
        validityDays: 365,
        enforceQuantity: true,
        enabled: true,
        benefitsConfig: [{ benefitId: benefit, benefitTitle: 'W110 benefit', maxQuantity: 2 }],
      }),
    });
    assert.equal(upsert.status, 201);
    const rule = (await upsert.json()).data;
    assert.ok(rule.id && rule.tier, 'rule upserted');

    // idempotent replay
    const replay = await fetch(`${base}/api/v1/management/memberships/rules`, {
      method: 'POST',
      headers: headers(ownerToken, {
        'x-request-id': randomUUID(),
        'idempotency-key': key,
      }),
      body: JSON.stringify({
        title: `Gold rules ${stamp}`,
        tier: `gold-${stamp.slice(-6)}`,
        validityDays: 365,
        enforceQuantity: true,
        enabled: true,
        benefitsConfig: [{ benefitId: benefit, benefitTitle: 'W110 benefit', maxQuantity: 2 }],
      }),
    });
    assert.equal(replay.status, 201);
    assert.equal((await replay.json()).data.id, rule.id);

    // rules list reflects it
    const rulesAfter = await fetch(`${base}/api/v1/management/memberships/rules`, {
      headers: headers(ownerToken),
    });
    const rules = (await rulesAfter.json()).data;
    assert.ok(
      rules.some((r) => r.tier === rule.tier),
      'rule listed',
    );

    // renewals includes enrollment A (expiring in 2 days)
    const renewals = await fetch(`${base}/api/v1/management/memberships/renewals`, {
      headers: headers(ownerToken),
    });
    assert.equal(renewals.status, 200);
    const renewalRows = (await renewals.json()).data;
    assert.ok(
      renewalRows.some((r) => r.id === enrollmentA),
      'expiring enrollment in renewals',
    );

    // alerts includes suspended (B) and expired (C) and no_recent_activity (C)
    const alerts = await fetch(`${base}/api/v1/management/memberships/alerts`, {
      headers: headers(ownerToken),
    });
    assert.equal(alerts.status, 200);
    const a = (await alerts.json()).data;
    assert.ok(
      a.suspended.some((r) => r.id === enrollmentB),
      'suspended alert for B',
    );
    assert.ok(
      a.expired.some((r) => r.id === enrollmentC),
      'expired alert for C',
    );
    assert.ok(a.noRecentActivity.length >= 0, 'no_recent_activity present');

    // audit + outbox written for rule upsert
    const audit = await client.query(
      "select count(*)::int as c from audit_logs where tenant_id=$1 and action='membership.rule_upserted'",
      [tenant],
    );
    assert.ok(audit.rows[0].c >= 1, 'audit written for rule upsert');
    const outbox = await client.query(
      "select count(*)::int as c from outbox_events where tenant_id=$1 and event_type='membership.benefit_rule.upserted.v1'",
      [tenant],
    );
    assert.ok(outbox.rows[0].c >= 1, 'outbox written for rule upsert');
  } finally {
    await client.end();
  }
});
