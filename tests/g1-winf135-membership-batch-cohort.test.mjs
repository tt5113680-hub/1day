/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';
import { URL } from 'node:url';

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
    AUTH_TOKEN_SECRET: 'g1-winf135-membership-batch-cohort',
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

test('G1-W135: static surface for cohort + batch-grants', () => {
  const depthC = read('apps/api/src/management-membership-depth.controller.ts');
  const depthS = read('apps/api/src/management-membership-depth.service.ts');
  const commercialC = read('apps/api/src/membership-commercial.controller.ts');
  const commercialS = read('apps/api/src/membership-commercial.service.ts');
  const page = read('apps/management-web/app/m/memberships/page.tsx');
  assert.match(depthC, /@Get\('cohort'\)/);
  assert.match(depthS, /async cohort/);
  assert.match(depthS, /still_valid|stillValid/);
  assert.match(commercialC, /batch-grants/);
  assert.match(commercialS, /async batchGrant/);
  assert.match(commercialS, /membership_batch_grant/);
  assert.match(page, /batch-grants/);
  assert.match(page, /入会月 cohort/);
  assert.match(page, /批量发放/);
  assert.match(page, /selectedIds/);
  assert.doesNotMatch(commercialS, /Math\.random/);
});

test('G1-W135: cohort + batch grant with real DB', async () => {
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
  const benefit = randomUUID();
  try {
    await client.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,$4,'team','active',null,null)",
      [organization, tenant, `mb135-org-${stamp}`, `MB135 org ${stamp}`],
    );
    await client.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
      [owner.user, `MB135-${stamp}@example.test`, 'MB135 owner'],
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
      [owner.employee, tenant, owner.membership, organization, `MBE135-${stamp}`],
    );
    await client.query(
      "insert into merchants(id,tenant_id,organization_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,$5,'active',null,null)",
      [merchant, tenant, organization, `mb135-m-${stamp}`, `MB135 merchant ${stamp}`],
    );
    await client.query(
      "insert into stores(id,tenant_id,organization_id,merchant_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,$5,$6,'active',null,null)",
      [store, tenant, organization, merchant, `mb135-s-${stamp}`, `MB135 store ${stamp}`],
    );
    await client.query(
      "insert into customers(id,tenant_id,display_name,status,created_by,updated_by) values($1,$2,$3,'active',null,null),($4,$2,$5,'active',null,null)",
      [customerA, tenant, `CustA ${stamp}`, customerB, `CustB ${stamp}`],
    );
    const codeA = `A${stamp}XXXXXXXX`.replace(/\D/g, 'A').slice(0, 12).toUpperCase();
    const codeB = `B${stamp}XXXXXXXX`.replace(/\D/g, 'B').slice(0, 12).toUpperCase();
    await client.query(
      `insert into membership_enrollments(id,tenant_id,customer_id,store_id,member_code,enrollment_status,tier,source,joined_at,created_by,updated_by)
       values($1,$2,$3,$4,$5,'active','standard','local',now(),null,null),
             ($6,$2,$7,$4,$8,'active','standard','local',now(),null,null)`,
      [enrollA, tenant, customerA, store, codeA, enrollB, customerB, codeB],
    );
    await client.query(
      "insert into store_benefits(id,tenant_id,store_id,title,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null)",
      [benefit, tenant, store, `Benefit ${stamp}`],
    );

    const token = await login(`MB135-${stamp}@example.test`);
    const cohortResp = await fetch(`${base}/api/v1/management/memberships/cohort?months=6`, {
      headers: headers(token),
    });
    assert.equal(cohortResp.status, 200, await cohortResp.clone().text());
    const cohort = (await cohortResp.json()).data;
    assert.equal(cohort.months, 6);
    assert.ok(Array.isArray(cohort.cohorts));
    assert.ok(cohort.cohorts.some((row) => row.enrolled >= 1));
    assert.match(cohort.disclaimer, /不含储值/);

    const key = randomUUID();
    const batchResp = await fetch(`${base}/api/v1/management/memberships/batch-grants`, {
      method: 'POST',
      headers: headers(token, { 'idempotency-key': key }),
      body: JSON.stringify({
        enrollmentIds: [enrollA, enrollB],
        benefitId: benefit,
        quantity: 1,
      }),
    });
    assert.equal(batchResp.status, 201, await batchResp.clone().text());
    const batch = (await batchResp.json()).data;
    assert.equal(batch.grantedCount, 2);
    assert.equal(batch.skippedCount, 0);

    const replay = await fetch(`${base}/api/v1/management/memberships/batch-grants`, {
      method: 'POST',
      headers: headers(token, { 'idempotency-key': key }),
      body: JSON.stringify({
        enrollmentIds: [enrollA, enrollB],
        benefitId: benefit,
        quantity: 1,
      }),
    });
    assert.equal(replay.status, 201);
    assert.equal((await replay.json()).data.grantedCount, 2);

    const ledger = await client.query(
      'select count(*)::int as c from member_benefit_ledger where tenant_id=$1 and enrollment_id=any($2::uuid[]) and benefit_id=$3 and entry_type=$4',
      [tenant, [enrollA, enrollB], benefit, 'grant'],
    );
    assert.equal(ledger.rows[0].c, 2);
  } finally {
    await client
      .query('delete from member_benefit_ledger where enrollment_id=any($1::uuid[])', [
        [enrollA, enrollB],
      ])
      .catch(() => undefined);
    await client
      .query('delete from membership_enrollments where id=any($1::uuid[])', [[enrollA, enrollB]])
      .catch(() => undefined);
    await client.query('delete from store_benefits where id=$1', [benefit]).catch(() => undefined);
    await client
      .query('delete from customers where id=any($1::uuid[])', [[customerA, customerB]])
      .catch(() => undefined);
    await client.query('delete from auth_sessions where user_id=$1', [owner.user]).catch(() => undefined);
    await client.query('delete from stores where id=$1', [store]).catch(() => undefined);
    await client.query('delete from merchants where id=$1', [merchant]).catch(() => undefined);
    await client.query('delete from employees where id=$1', [owner.employee]).catch(() => undefined);
    await client
      .query('delete from membership_roles where membership_id=$1', [owner.membership])
      .catch(() => undefined);
    await client.query('delete from memberships where id=$1', [owner.membership]).catch(() => undefined);
    await client.query('delete from users where id=$1', [owner.user]).catch(() => undefined);
    await client.query('delete from organizations where id=$1', [organization]).catch(() => undefined);
    await client.end();
  }
});
