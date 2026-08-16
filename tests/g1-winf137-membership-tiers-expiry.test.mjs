/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { URL } from 'node:url';
import test from 'node:test';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');
const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const tenant = '00000000-0000-4000-8000-000000000001';
const base = 'http://127.0.0.1:3078';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3078',
    DATABASE_URL: db,
    AUTH_TOKEN_SECRET: 'g1-winf137-membership-tiers-expiry',
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

test('G1-W137: static surface for tiers + batch-expiry', () => {
  const depthC = read('apps/api/src/management-membership-depth.controller.ts');
  const depthS = read('apps/api/src/management-membership-depth.service.ts');
  const page = read('apps/management-web/app/m/memberships/page.tsx');
  assert.match(depthC, /@Get\('tiers'\)/);
  assert.match(depthC, /batch-expiry/);
  assert.match(depthS, /async tiers/);
  assert.match(depthS, /async batchExpiry/);
  assert.match(depthS, /expiring_soon|expiringSoon/);
  assert.match(depthS, /membership_batch_expiry/);
  assert.match(page, /tiers/);
  assert.match(page, /会员等级分布/);
  assert.match(page, /批量到期策略/);
  assert.match(page, /expiryDays/);
  assert.doesNotMatch(depthS, /Math\.random/);
});

test('G1-W137: tiers + batch expiry with real DB', async () => {
  await ready();
  const client = new Client({ connectionString: db });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const organization = randomUUID();
  const owner = { user: randomUUID(), membership: randomUUID(), employee: randomUUID() };
  const merchant = randomUUID();
  const store = randomUUID();
  const customerA = randomUUID();
  const customerB = randomUUID();
  const enrollA = randomUUID();
  const enrollB = randomUUID();
  // Baseline existing tier counts for the shared tenant so assertions are
  // robust to leftover seed data in the persistent oneday_v3_test DB.
  const baseline = await client.query(
    `select tier, count(*)::int as c from membership_enrollments
     where tenant_id=$1 and deleted_at is null and tier in ('gold','standard')
     group by tier`,
    [tenant],
  );
  const countByTier = new Map(baseline.rows.map((r) => [String(r.tier), Number(r.c)]));
  const baseGold = countByTier.get('gold') ?? 0;
  const baseStandard = countByTier.get('standard') ?? 0;
  const baseBatchAudit = (
    await client.query(
      "select count(*)::int as c from audit_logs where action='membership.batch_expiry_applied' and tenant_id=$1",
      [tenant],
    )
  ).rows[0].c;
  try {
    await client.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,$4,'team','active',null,null)",
      [organization, tenant, `mb137-org-${stamp}`, `MB137 org ${stamp}`],
    );
    await client.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
      [owner.user, `MB137-${stamp}@example.test`, 'MB137 owner'],
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
      [owner.employee, tenant, owner.membership, organization, `MBE137-${stamp}`],
    );
    await client.query(
      "insert into merchants(id,tenant_id,organization_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,$5,'active',null,null)",
      [merchant, tenant, organization, `mb137-m-${stamp}`, `MB137 merchant ${stamp}`],
    );
    await client.query(
      "insert into stores(id,tenant_id,organization_id,merchant_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,$5,$6,'active',null,null)",
      [store, tenant, organization, merchant, `mb137-s-${stamp}`, `MB137 store ${stamp}`],
    );
    await client.query(
      "insert into customers(id,tenant_id,display_name,status,created_by,updated_by) values($1,$2,$3,'active',null,null),($4,$2,$5,'active',null,null)",
      [customerA, tenant, `CustA ${stamp}`, customerB, `CustB ${stamp}`],
    );
    const codeA = `A${stamp}XXXXXXXX`.replace(/\D/g, 'A').slice(0, 12).toUpperCase();
    const codeB = `B${stamp}XXXXXXXX`.replace(/\D/g, 'B').slice(0, 12).toUpperCase();
    const now = new Date();
    const expiring = new Date(now.getTime() + 7 * 86400000).toISOString();
    await client.query(
      `insert into membership_enrollments(id,tenant_id,customer_id,store_id,member_code,enrollment_status,tier,source,joined_at,expires_at,created_by,updated_by)
       values($1,$2,$3,$4,$5,'active','gold','local',now(),$6,null,null),
             ($7,$2,$8,$4,$9,'active','standard','local',now(),null,null,null)`,
      [enrollA, tenant, customerA, store, codeA, expiring, enrollB, customerB, codeB],
    );
    await client.query(
      `insert into membership_benefit_rules(id,tenant_id,title,tier,benefits_config,validity_days,enforce_quantity,enabled,created_by,updated_by)
       values($1,$2,'Gold','gold','[]',365,false,true,null,null)`,
      [randomUUID(), tenant],
    );

    const token = await login(`MB137-${stamp}@example.test`);
    const tiersResp = await fetch(`${base}/api/v1/management/memberships/tiers`, {
      headers: headers(token),
    });
    assert.equal(tiersResp.status, 200, await tiersResp.clone().text());
    const tiers = (await tiersResp.json()).data;
    assert.ok(Array.isArray(tiers.tiers));
    const gold = tiers.tiers.find((row) => row.tier === 'gold');
    const standard = tiers.tiers.find((row) => row.tier === 'standard');
    assert.ok(gold, 'gold tier present');
    assert.ok(standard, 'standard tier present');
    assert.equal(gold.enrolled, baseGold + 1, 'gold enrolled increments by 1 over baseline');
    assert.equal(
      standard.enrolled,
      baseStandard + 1,
      'standard enrolled increments by 1 over baseline',
    );
    assert.ok(gold.expiringSoon >= 1);
    assert.match(tiers.disclaimer, /不含储值/);

    const key = randomUUID();
    const expiryResp = await fetch(`${base}/api/v1/management/memberships/batch-expiry`, {
      method: 'POST',
      headers: headers(token, { 'idempotency-key': key }),
      body: JSON.stringify({ enrollmentIds: [enrollA, enrollB], addDays: 90 }),
    });
    assert.equal(expiryResp.status, 201, await expiryResp.clone().text());
    const expiry = (await expiryResp.json()).data;
    assert.equal(expiry.addDays, 90);
    assert.equal(expiry.updatedCount, 2);
    assert.equal(expiry.skippedCount, 0);
    assert.match(expiry.disclaimer, /不含储值/);

    const replay = await fetch(`${base}/api/v1/management/memberships/batch-expiry`, {
      method: 'POST',
      headers: headers(token, { 'idempotency-key': key }),
      body: JSON.stringify({ enrollmentIds: [enrollA, enrollB], addDays: 90 }),
    });
    assert.equal(replay.status, 201);
    assert.equal((await replay.json()).data.updatedCount, 2);

    const check = await client.query(
      'select expires_at from membership_enrollments where tenant_id=$1 and id=any($2::uuid[]) order by id',
      [tenant, [enrollA, enrollB]],
    );
    for (const row of check.rows) assert.ok(row.expires_at instanceof Date);
    assert.ok(Number(check.rows[0].expires_at) > Date.now());

    const audit = await client.query(
      "select count(*)::int as c from audit_logs where action='membership.batch_expiry_applied' and tenant_id=$1",
      [tenant],
    );
    assert.equal(audit.rows[0].c, baseBatchAudit + 1);
    const perItem = await client.query(
      "select count(*)::int as c from outbox_events where event_type='membership.expiry.extended.v1' and tenant_id=$1 and aggregate_id=any($2::uuid[])",
      [tenant, [enrollA, enrollB]],
    );
    assert.equal(perItem.rows[0].c, 2);

    const invalid = await fetch(`${base}/api/v1/management/memberships/batch-expiry`, {
      method: 'POST',
      headers: headers(token, { 'idempotency-key': randomUUID() }),
      body: JSON.stringify({ enrollmentIds: [enrollA], addDays: 0 }),
    });
    assert.equal(invalid.status, 400, await invalid.clone().text());
  } finally {
    await client
      .query('delete from membership_benefit_rules where tenant_id=$1', [tenant])
      .catch(() => undefined);
    await client
      .query('delete from membership_enrollments where id=any($1::uuid[])', [[enrollA, enrollB]])
      .catch(() => undefined);
    await client
      .query('delete from customers where id=any($1::uuid[])', [[customerA, customerB]])
      .catch(() => undefined);
    await client
      .query('delete from auth_sessions where user_id=$1', [owner.user])
      .catch(() => undefined);
    await client.query('delete from stores where id=$1', [store]).catch(() => undefined);
    await client.query('delete from merchants where id=$1', [merchant]).catch(() => undefined);
    await client
      .query('delete from employees where id=$1', [owner.employee])
      .catch(() => undefined);
    await client
      .query('delete from membership_roles where membership_id=$1', [owner.membership])
      .catch(() => undefined);
    await client
      .query('delete from memberships where id=$1', [owner.membership])
      .catch(() => undefined);
    await client.query('delete from users where id=$1', [owner.user]).catch(() => undefined);
    await client
      .query('delete from organizations where id=$1', [organization])
      .catch(() => undefined);
    await client.end();
  }
});
