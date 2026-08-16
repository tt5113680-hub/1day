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
const base = 'http://127.0.0.1:3076';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3076',
    DATABASE_URL: db,
    AUTH_TOKEN_SECRET: 'g1-winj133-member-renewal',
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
  for (let i = 0; i < 30; i += 1) {
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
test('W133 member-expiry/expired surfaced as renewal notifications tenant-isolated with /m/memberships deep-link', async () => {
  await ready();
  const client = new Client({ connectionString: db });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const owner = { user: randomUUID(), membership: randomUUID(), employee: randomUUID() };
  const organization = randomUUID();
  const customerExpiring = randomUUID();
  const customerExpired = randomUUID();
  const customerFresh = randomUUID();
  const expiring = randomUUID();
  const expired = randomUUID();
  const fresh = randomUUID();
  try {
    await client.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,'W133 org','team','active',null,null)",
      [organization, tenant, `w133-org-${stamp}`],
    );
    await client.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,'W133 owner',password_hash,'active',null,null from users where email='admin@system.local'",
      [owner.user, `W133-${stamp}@example.test`],
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
      [owner.employee, tenant, owner.membership, organization, `W133EMP${stamp}`],
    );
    const store = randomUUID();
    const merchant = randomUUID();
    await client.query(
      "insert into merchants(id,tenant_id,organization_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,$5,'active',null,null)",
      [merchant, tenant, organization, `w133-merchant-${stamp}`, 'W133 merchant'],
    );
    await client.query(
      "insert into stores(id,tenant_id,organization_id,merchant_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,$5,$6,'active',null,null)",
      [store, tenant, organization, merchant, `w133-store-${stamp}`, 'W133 store'],
    );
    for (const [cid, code] of [
      [customerExpiring, 'expiring'],
      [customerExpired, 'expired'],
      [customerFresh, 'fresh'],
    ]) {
      await client.query(
        "insert into customers(id,tenant_id,display_name,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
        [cid, tenant, `W133 ${code} customer`],
      );
    }
    // expiring: expires within 3 days -> member_expiry renewal
    await client.query(
      "insert into membership_enrollments(id,tenant_id,customer_id,store_id,member_code,enrollment_status,source,expires_at,joined_at,last_active_at,created_by,updated_by) values($1,$2,$3,$4,$5,'active','seed',now()+interval '2 days',now()-interval '5 days',now()-interval '1 day',null,null)",
      [expiring, tenant, customerExpiring, store, `W133EXP${stamp.slice(-6)}`],
    );
    // expired: expires_at in the past -> member_expired renewal
    await client.query(
      "insert into membership_enrollments(id,tenant_id,customer_id,store_id,member_code,enrollment_status,source,expires_at,joined_at,last_active_at,created_by,updated_by) values($1,$2,$3,$4,$5,'active','seed',now()-interval '2 days',now()-interval '20 days',now()-interval '3 days',null,null)",
      [expired, tenant, customerExpired, store, `W133EXPD${stamp.slice(-6)}`],
    );
    // fresh: expires far in future, active recently -> NOT a renewal (honest, no false expiry)
    await client.query(
      "insert into membership_enrollments(id,tenant_id,customer_id,store_id,member_code,enrollment_status,source,expires_at,joined_at,last_active_at,created_by,updated_by) values($1,$2,$3,$4,$5,'active','seed',now()+interval '180 days',now()-interval '2 days',now(),null,null)",
      [fresh, tenant, customerFresh, store, `W133FRESH${stamp.slice(-6)}`],
    );

    assert.equal(
      (
        await fetch(`${base}/api/v1/management/notifications`, {
          headers: { 'x-request-id': randomUUID() },
        })
      ).status,
      401,
    );
    const token = await login(`W133-${stamp}@example.test`);
    const list = await fetch(`${base}/api/v1/management/notifications`, {
      headers: headers(token),
    });
    assert.equal(list.status, 200);
    const payload = (await list.json()).data;
    assert.equal(typeof payload.counts, 'object');

    // category=renewal isolates the new 会员到期/异常 bucket without the default 100-row cross-category truncation
    const renewalBucket = await fetch(`${base}/api/v1/management/notifications?category=renewal`, {
      headers: headers(token),
    });
    assert.equal(renewalBucket.status, 200);
    const renewalData = (await renewalBucket.json()).data;
    const renewals = renewalData.items;
    assert.ok(renewals.length >= 2, `expected renewal notifications, got ${renewals.length}`);
    assert.ok(
      renewals.every((item) => item.category === 'renewal'),
      'category=renewal filters to renewal only',
    );
    assert.ok(
      renewals.every((item) => item.deepLink === '/m/memberships'),
      'renewal deep-links to /m/memberships',
    );
    const expiringHit = renewals.find((item) => item.id === expiring);
    const expiredHit = renewals.find((item) => item.id === expired);
    assert.ok(expiringHit, 'expiring membership surfaced as renewal -> 会员将到期');
    assert.ok(expiredHit, 'expired membership surfaced as renewal -> 会员已过期');
    assert.ok(expiringHit.title.includes('会员将到期'), expiringHit.title);
    assert.ok(expiredHit.title.includes('会员已过期'), expiredHit.title);
    assert.ok(
      !renewals.some((item) => item.id === fresh),
      'fresh in-validity member is NOT surfaced',
    );
    assert.equal(typeof renewalData.counts.renewal, 'number');
    assert.ok(renewalData.counts.renewal >= 2, `renewal count ${renewalData.counts.renewal}`);
  } finally {
    await client.end();
  }
});
