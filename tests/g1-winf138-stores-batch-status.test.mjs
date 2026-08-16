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
const base = 'http://127.0.0.1:3082';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3082',
    DATABASE_URL: db,
    AUTH_TOKEN_SECRET: 'g1-winf138-stores-batch-status',
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

test('G1-W138: static surface for store batch-status', () => {
  const depthC = read('apps/api/src/management-store-depth.controller.ts');
  const depthS = read('apps/api/src/management-store-depth.service.ts');
  const page = read('apps/management-web/app/m/stores/page.tsx');
  assert.match(depthC, /batch-status/);
  assert.match(depthS, /async batchStatus/);
  assert.match(depthS, /store_batch_status/);
  assert.match(depthS, /store\.batch_status_/);
  assert.match(page, /门店营业状态批量/);
  assert.match(page, /batch-status/);
  assert.match(page, /批量应用营业状态/);
  assert.match(page, /selectedStores/);
  assert.doesNotMatch(depthS, /Math\.random/);
});

test('G1-W138: batch store business status with real DB', async () => {
  await ready();
  const client = new Client({ connectionString: db });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const organization = randomUUID();
  const owner = { user: randomUUID(), membership: randomUUID(), employee: randomUUID() };
  const merchant = randomUUID();
  const storeA = randomUUID();
  const storeB = randomUUID();
  const baselineAudit = (
    await client.query(
      "select count(*)::int as c from audit_logs where action like 'store.batch_status_%' and tenant_id=$1 and resource_id=any($2::uuid[])",
      [tenant, [storeA, storeB]],
    )
  ).rows[0].c;
  const baselineOutbox = (
    await client.query(
      "select count(*)::int as c from outbox_events where event_type like 'store.batch_status_%.v1' and tenant_id=$1 and aggregate_id=any($2::uuid[])",
      [tenant, [storeA, storeB]],
    )
  ).rows[0].c;
  try {
    await client.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,$4,'team','active',null,null)",
      [organization, tenant, `mb138-org-${stamp}`, `MB138 org ${stamp}`],
    );
    await client.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
      [owner.user, `MB138-${stamp}@example.test`, 'MB138 owner'],
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
      [owner.employee, tenant, owner.membership, organization, `MBE138-${stamp}`],
    );
    await client.query(
      "insert into merchants(id,tenant_id,organization_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,$5,'active',null,null)",
      [merchant, tenant, organization, `mb138-m-${stamp}`, `MB138 merchant ${stamp}`],
    );
    await client.query(
      "insert into stores(id,tenant_id,organization_id,merchant_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,$5,$6,'active',null,null),($7,$2,$3,$4,$8,$9,'active',null,null)",
      [
        storeA,
        tenant,
        organization,
        merchant,
        `mb138-sa-${stamp}`,
        `MB138 storeA ${stamp}`,
        storeB,
        `mb138-sb-${stamp}`,
        `MB138 storeB ${stamp}`,
      ],
    );

    const token = await login(`MB138-${stamp}@example.test`);
    const key = randomUUID();
    const batch = await fetch(`${base}/api/v1/management/stores/depth/batch-status`, {
      method: 'POST',
      headers: headers(token, { 'idempotency-key': key }),
      body: JSON.stringify({ storeIds: [storeA, storeB], status: 'inactive' }),
    });
    assert.equal(batch.status, 201, await batch.clone().text());
    const result = (await batch.json()).data;
    assert.equal(result.status, 'inactive');
    assert.equal(result.effected, 2, 'both seeded stores updated');
    assert.deepEqual(
      result.stores.map((row) => row.status),
      ['inactive', 'inactive'],
    );

    const replay = await fetch(`${base}/api/v1/management/stores/depth/batch-status`, {
      method: 'POST',
      headers: headers(token, { 'idempotency-key': key }),
      body: JSON.stringify({ storeIds: [storeA, storeB], status: 'inactive' }),
    });
    assert.equal(replay.status, 201);
    assert.equal((await replay.json()).data.effected, 2);

    const check = await client.query(
      'select status from stores where tenant_id=$1 and id=any($2::uuid[]) order by id',
      [tenant, [storeA, storeB]],
    );
    assert.ok(check.rows.every((row) => row.status === 'inactive'));

    const audit = await client.query(
      "select count(*)::int as c from audit_logs where action='store.batch_status_inactive' and tenant_id=$1 and resource_id=any($2::uuid[])",
      [tenant, [storeA, storeB]],
    );
    assert.equal(audit.rows[0].c, baselineAudit + 1);
    const outbox = await client.query(
      "select count(*)::int as c from outbox_events where event_type='store.batch_status_inactive.v1' and tenant_id=$1 and aggregate_id=any($2::uuid[])",
      [tenant, [storeA, storeB]],
    );
    assert.equal(outbox.rows[0].c, baselineOutbox + 2, 'one outbox row per affected store');

    const invalid = await fetch(`${base}/api/v1/management/stores/depth/batch-status`, {
      method: 'POST',
      headers: headers(token, { 'idempotency-key': randomUUID() }),
      body: JSON.stringify({ storeIds: [storeA], status: 'bogus' }),
    });
    assert.equal(invalid.status, 400, await invalid.clone().text());

    const restore = await fetch(`${base}/api/v1/management/stores/depth/batch-status`, {
      method: 'POST',
      headers: headers(token, { 'idempotency-key': randomUUID() }),
      body: JSON.stringify({ storeIds: [storeA, storeB], status: 'active' }),
    });
    assert.equal(restore.status, 201);
    assert.equal((await restore.json()).data.effected, 2);
  } finally {
    await client
      .query('delete from stores where id=any($1::uuid[])', [[storeA, storeB]])
      .catch(() => undefined);
    await client.query('delete from merchants where id=$1', [merchant]).catch(() => undefined);
    await client
      .query('delete from auth_sessions where user_id=$1', [owner.user])
      .catch(() => undefined);
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
