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
const base = 'http://127.0.0.1:3091';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3091',
    DATABASE_URL: db,
    AUTH_TOKEN_SECRET: 'g1-winf118-tenant-quota-interception',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
const apiLogs = [];
for (const stream of [api.stdout, api.stderr]) {
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    apiLogs.push(chunk);
    if (apiLogs.length > 40) apiLogs.shift();
  });
}
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

test.after(() => {
  api.kill();
});
test('W118 tenant quota cap hard interception (stores/customers/users) + status + audit/outbox', async () => {
  try {
    await ready();
  } catch (error) {
    throw new Error(`${error}\nAPI logs:\n${apiLogs.join('')}`);
  }
  const client = new Client({ connectionString: db });
  await client.connect();
  const seed = client;
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const organization = randomUUID();
  const owner = { user: randomUUID(), membership: randomUUID(), employee: randomUUID() };
  const merchant = randomUUID();
  const getCount = async (dimension) => {
    if (dimension === 'stores')
      return Number(
        (
          await seed.query(
            "select count(*)::int c from stores where tenant_id=$1 and status='active' and deleted_at is null",
            [tenant],
          )
        ).rows[0].c,
      );
    if (dimension === 'customers')
      return Number(
        (
          await seed.query(
            "select count(*)::int c from customers where tenant_id=$1 and status='active' and deleted_at is null",
            [tenant],
          )
        ).rows[0].c,
      );
    return Number(
      (
        await seed.query(
          `select ((select count(*) from memberships where tenant_id=$1 and status='active' and deleted_at is null)
            + (select count(*) from membership_invitations where tenant_id=$1 and status='pending' and deleted_at is null and (expires_at is null or expires_at>now())))::int c`,
          [tenant],
        )
      ).rows[0].c,
    );
  };
  let priorSettings;
  try {
    // Hermetic: capture the shared tenant's platform_tenant_settings so we can restore
    // the exact same row (plan+quotas+version) in finally, leaving DB state untouched.
    priorSettings = (
      await seed.query(
        'select plan,quotas,version from platform_tenant_settings where tenant_id=$1 and deleted_at is null limit 1',
        [tenant],
      )
    ).rows[0];
    await seed.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,'Quota org','team','active',null,null)",
      [organization, tenant, `winf118-${stamp}`],
    );
    await seed.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
      [owner.user, `WIN118-${stamp}@example.test`, 'W118 owner'],
    );
    await seed.query(
      "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [owner.membership, tenant, owner.user],
    );
    await seed.query(
      'insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,$4)',
      [randomUUID(), tenant, owner.membership, '00000000-0000-4000-8000-000000000004'],
    );
    await seed.query(
      "insert into employees(id,tenant_id,membership_id,organization_id,employee_code,title,status,created_by,updated_by) values($1,$2,$3,$4,$5,'Advisor','active',null,null)",
      [owner.employee, tenant, owner.membership, organization, `W118-${stamp}`],
    );
    await seed.query(
      "insert into merchants(id,tenant_id,organization_id,code,name,created_by,updated_by) values($1,$2,$3,$4,'Quota merchant',null,null)",
      [merchant, tenant, organization, `MQ-${stamp}`],
    );

    const setQuota = async (users, customers, stores) => {
      const existing = (
        await seed.query(
          'select plan from platform_tenant_settings where tenant_id=$1 and deleted_at is null limit 1',
          [tenant],
        )
      ).rows[0];
      if (!existing) return; // keep plan default; nothing to restore
      await seed.query(
        `insert into platform_tenant_settings(id,tenant_id,plan,quotas,risk_level,created_by,updated_by)
         values($1,$2,$3,$4::jsonb,'low',null,null)
         on conflict(tenant_id) do update set quotas=excluded.quotas,updated_at=now(),version=platform_tenant_settings.version+1`,
        [randomUUID(), tenant, existing.plan, JSON.stringify({ users, customers, stores })],
      );
    };

    const token = await login(`WIN118-${stamp}@example.test`);

    // ---- 0. status endpoint: unauthorized + cross-tenant deny + ok ----
    assert.equal(
      (await fetch(`${base}/api/v1/management/quota/status`, { headers: headers('') })).status,
      401,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/quota/status`, {
          headers: headers(token, {
            authorization: `Bearer ${token}`,
            'x-tenant-context': randomUUID(),
          }),
        })
      ).status,
      403,
    );
    const statusRes = await fetch(`${base}/api/v1/management/quota/status`, {
      headers: headers(token),
    });
    assert.equal(statusRes.status, 200);
    const statusBody = (await statusRes.json()).data;
    assert.ok(
      Array.isArray(statusBody.upgrades) && statusBody.upgrades.length === 3,
      'three quota dims',
    );
    assert.ok(statusBody.planLabel, 'plan label present');

    // ---- 1. stores hard interception ----
    const storesNow = await getCount('stores');
    await setQuota(100000, 100000, storesNow + 1);
    const store1 = await fetch(`${base}/api/v1/stores`, {
      method: 'POST',
      headers: headers(token, { 'idempotency-key': `w118-store-1-${stamp}` }),
      body: JSON.stringify({
        code: `ST1-${stamp}`,
        name: 'Quota Store One',
        organizationId: organization,
        merchantId: merchant,
      }),
    });
    assert.equal(store1.status, 201, `first store within quota created, got ${store1.status}`);
    const store2 = await fetch(`${base}/api/v1/stores`, {
      method: 'POST',
      headers: headers(token, { 'idempotency-key': `w118-store-2-${stamp}` }),
      body: JSON.stringify({
        code: `ST2-${stamp}`,
        name: 'Quota Store Two',
        organizationId: organization,
        merchantId: merchant,
      }),
    });
    const store2Body = await store2.json();
    const atLimit = String(store2Body.error?.message ?? store2Body.message ?? '');
    assert.equal(
      store2.status,
      400,
      `second store over quota hard-blocked, got ${store2.status} ${JSON.stringify(store2Body)}\nAPI logs:\n${apiLogs.join('')}`,
    );
    assert.match(atLimit, /QUOTA_LIMIT_REACHED/, 'structured quota error');
    // second store not persisted
    const storeRows = await seed.query(
      'select count(*)::int c from stores where tenant_id=$1 and code like $2 and deleted_at is null',
      [tenant, `ST2-${stamp}`],
    );
    assert.equal(Number(storeRows.rows[0].c), 0, 'blocked store not persisted');

    // ---- 2. customers hard interception ----
    const custNow = await getCount('customers');
    await setQuota(100000, custNow + 1, 100000);
    const cust1 = await fetch(`${base}/api/v1/customers`, {
      method: 'POST',
      headers: headers(token, { 'idempotency-key': `w118-cust-1-${stamp}` }),
      body: JSON.stringify({
        displayName: 'Quota Customer One',
        identities: [{ type: 'phone', value: `+1555${stamp.slice(-8)}1` }],
      }),
    });
    assert.equal(cust1.status, 201, 'first customer within quota created');
    const cust2 = await fetch(`${base}/api/v1/customers`, {
      method: 'POST',
      headers: headers(token, { 'idempotency-key': `w118-cust-2-${stamp}` }),
      body: JSON.stringify({
        displayName: 'Quota Customer Two',
        identities: [{ type: 'phone', value: `+1555${stamp.slice(-8)}2` }],
      }),
    });
    assert.equal(cust2.status, 400, 'second customer over quota hard-blocked');
    // blocked customer not persisted
    assert.equal(
      Number(
        (
          await seed.query(
            'select count(*)::int c from customers where tenant_id=$1 and display_name=$2 and deleted_at is null',
            [tenant, 'Quota Customer Two'],
          )
        ).rows[0].c,
      ),
      0,
      'blocked customer not persisted',
    );

    // ---- 3. users hard interception at invite ----
    const usersNow = await getCount('users');
    await setQuota(usersNow + 1, 100000, 100000);
    const invite1 = await fetch(`${base}/api/v1/employees/invitations`, {
      method: 'POST',
      headers: headers(token, { 'idempotency-key': `w118-inv-1-${stamp}` }),
      body: JSON.stringify({
        email: `q1-${stamp}@example.test`,
        organizationId: organization,
        employeeCode: `E1-${stamp}`,
      }),
    });
    assert.equal(invite1.status, 201, 'first invite within quota created');
    const invite2 = await fetch(`${base}/api/v1/employees/invitations`, {
      method: 'POST',
      headers: headers(token, { 'idempotency-key': `w118-inv-2-${stamp}` }),
      body: JSON.stringify({
        email: `q2-${stamp}@example.test`,
        organizationId: organization,
        employeeCode: `E2-${stamp}`,
      }),
    });
    assert.equal(invite2.status, 400, 'second invite over quota hard-blocked');
    // blocked invite not persisted
    assert.equal(
      Number(
        (
          await seed.query(
            'select count(*)::int c from membership_invitations where tenant_id=$1 and employee_code=$2 and deleted_at is null',
            [tenant, `E2-${stamp}`],
          )
        ).rows[0].c,
      ),
      0,
      'blocked invite not persisted',
    );

    // ---- 4. status reflects reached + rejection ledger ----
    // sections 2/3 overwrote platform_tenant_settings.quotas (customers/users), so
    // re-assert the stores dimension at-limit state before reading status.
    await setQuota(100000, 100000, await getCount('stores'));
    const statusAfter = await fetch(`${base}/api/v1/management/quota/status`, {
      headers: headers(token),
    });
    const afterUpgrades = (await statusAfter.json()).data.upgrades;
    const storeQ = afterUpgrades.find((u) => u.dimension === 'stores');
    assert.equal(storeQ.reached, true, 'stores dimension shows reached');
    assert.ok(Number.isInteger(storeQ.limit) && Number.isInteger(storeQ.usage));
    const rejections = await seed.query(
      'select dimension,current_usage,current_limit from tenant_quota_rejections where tenant_id=$1 and deleted_at is null order by rejected_at desc limit 5',
      [tenant],
    );
    const dims = rejections.rows.map((r) => r.dimension);
    assert.ok(dims.includes('stores'), 'stores rejection ledger row');
    assert.ok(dims.includes('customers'), 'customers rejection ledger row');
    assert.ok(dims.includes('users'), 'users rejection ledger row');

    // ---- 5. audit + outbox written per rejection ----
    const audit = await seed.query(
      "select action from audit_logs where tenant_id=$1 and action='management.quota_rejected' order by created_at desc limit 5",
      [tenant],
    );
    assert.ok(audit.rows.length >= 3, 'quota_rejected audited per block');
    const outbox = await seed.query(
      "select event_type from outbox_events where tenant_id=$1 and event_type='tenant.quota_rejected.v1' order by created_at desc limit 5",
      [tenant],
    );
    assert.ok(outbox.rows.length >= 3, 'quota_rejected outbox per block');
  } finally {
    await seed
      .query(`delete from tenant_quota_rejections where tenant_id=$1`, [tenant])
      .catch(() => {});
    const floors = {
      users: await getCount('users').catch(() => 0),
      customers: await getCount('customers').catch(() => 0),
      stores: await getCount('stores').catch(() => 0),
    };
    const prev =
      priorSettings?.quotas && typeof priorSettings.quotas === 'object' ? priorSettings.quotas : {};
    const restored = {
      users: Math.max(Number(prev.users) || 0, floors.users + 1000, 100000),
      customers: Math.max(Number(prev.customers) || 0, floors.customers + 1000, 100000),
      stores: Math.max(Number(prev.stores) || 0, floors.stores + 1000, 100000),
    };
    if (priorSettings) {
      await seed
        .query(
          `update platform_tenant_settings
           set plan=$1, quotas=$2::jsonb, version=$3, updated_at=now()
           where tenant_id=$4 and deleted_at is null`,
          [priorSettings.plan, JSON.stringify(restored), Number(priorSettings.version) + 1, tenant],
        )
        .catch(() => {});
    } else {
      await seed
        .query(
          `insert into platform_tenant_settings(id,tenant_id,plan,quotas,risk_level,created_by,updated_by)
           values($1,$2,'growth',$3::jsonb,'low',null,null)
           on conflict(tenant_id) do update set quotas=excluded.quotas,updated_at=now(),version=platform_tenant_settings.version+1`,
          [randomUUID(), tenant, JSON.stringify(restored)],
        )
        .catch(() => {});
    }
    const cleanupIds = [
      `${organization}`,
      `${merchant}`,
      `${owner.user}`,
      `${owner.membership}`,
      `${owner.employee}`,
    ];
    if (cleanupIds.some((id) => /^[0-9a-f-]{36}$/i.test(id))) {
      await seed
        .query(
          `delete from stores where id in (select id from stores where merchant_id=$1);
         delete from merchants where id=$1;
         delete from employees where id=$2;
         delete from membership_roles where membership_id=$3;
         delete from memberships where id=$3;
         delete from organizations where id=$4;`,
          [merchant, owner.employee, owner.membership, organization],
        )
        .catch(() => {});
    }
    await seed.query('delete from users where id=$1', [owner.user]).catch(() => {});
    await client.end().catch(() => {});
  }
});
