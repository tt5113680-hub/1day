/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const base = 'http://127.0.0.1:3050';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3050', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'page-c-007-api' },
  stdio: 'ignore',
});
const hash = (value) => createHash('sha256').update(value).digest('hex');
async function ready() {
  for (let i = 0; i < 30; i += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      // API is starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw Error('API did not start');
}
test.after(() => api.kill());

test('consumer profile minimizes data and revokes consent idempotently', async () => {
  await ready();
  const c = new Client({ connectionString: db });
  await c.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const tenant = randomUUID();
  const customer = randomUUID();
  const organization = randomUUID();
  const merchant = randomUUID();
  const store = randomUUID();
  const profile = randomUUID();
  const slug = `profile-${stamp}`;
  const access = `profile-access-${stamp}`;
  const key = `profile-revoke-${stamp}`;
  try {
    await c.query(
      "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,'Profile tenant','active',null,null)",
      [tenant, slug],
    );
    await c.query(
      "insert into customers(id,tenant_id,display_name,status,created_by,updated_by) values($1,$2,'Private Person','active',null,null)",
      [customer, tenant],
    );
    await c.query(
      "insert into customer_identities(id,tenant_id,customer_id,identity_type,identity_value_hash,masked_value,status,created_by,updated_by) values($1,$2,$3,'phone',$4,'138****8000','active',null,null)",
      [randomUUID(), tenant, customer, hash('13800008000')],
    );
    await c.query(
      "insert into customer_orders(id,tenant_id,customer_id,order_number,occurred_at,status,created_by,updated_by) values($1,$2,$3,'PROFILE-001',now(),'active',null,null)",
      [randomUUID(), tenant, customer],
    );
    await c.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,'Profile organization','enterprise','active',null,null)",
      [organization, tenant, `profile-org-${stamp}`],
    );
    await c.query(
      "insert into merchants(id,tenant_id,organization_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,'Profile merchant','active',null,null)",
      [merchant, tenant, organization, `profile-merchant-${stamp}`],
    );
    await c.query(
      "insert into stores(id,tenant_id,organization_id,merchant_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,$5,'Profile store','active',null,null)",
      [store, tenant, organization, merchant, `profile-store-${stamp}`],
    );
    await c.query(
      "insert into store_benefits(id,tenant_id,store_id,title,description,status,created_by,updated_by) values($1,$2,$3,'Member benefit','A tenant-only benefit','active',null,null)",
      [randomUUID(), tenant, store],
    );
    await c.query(
      "insert into consumer_profile_accesses(id,tenant_id,customer_id,access_token_hash,consent_version,expires_at,status,created_by,updated_by) values($1,$2,$3,$4,'v1','2030-01-01','active',null,null)",
      [profile, tenant, customer, hash(access)],
    );

    const ok = await fetch(
      `${base}/api/v1/consumer/profile/${profile}?tenant=${slug}&access=${access}`,
    );
    assert.equal(ok.status, 200);
    const initial = (await ok.json()).data;
    assert.equal(initial.profile.identities[0].maskedValue, '138****8000');
    assert.equal(initial.history[0].orderNumber, 'PROFILE-001');
    assert.equal(initial.benefits[0].title, 'Member benefit');
    assert.equal(JSON.stringify(initial).includes('13800008000'), false);
    assert.equal(
      (await fetch(`${base}/api/v1/consumer/profile/${profile}?tenant=system&access=${access}`))
        .status,
      404,
    );

    const endpoint = `${base}/api/v1/consumer/profile/${profile}/consent/revoke?tenant=${slug}&access=${access}`;
    const revoke = () =>
      fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': key },
        body: JSON.stringify({ version: 1 }),
      });
    const first = await revoke();
    assert.equal(first.status, 201);
    const firstData = (await first.json()).data;
    assert.equal(firstData.consent_status, 'revoked');
    assert.equal(firstData.version, 2);
    const replay = await revoke();
    assert.equal(replay.status, 201);
    assert.deepEqual((await replay.json()).data, firstData);
    assert.equal(
      (await fetch(`${base}/api/v1/consumer/profile/${profile}?tenant=${slug}&access=${access}`))
        .status,
      404,
    );
    const counts = await c.query(
      "select (select count(*) from audit_logs where tenant_id=$1 and action='consumer.profile_consent_revoked')::int as audits,(select count(*) from outbox_events where tenant_id=$1 and event_type='consumer.profile.consent.revoked.v1')::int as outbox,(select count(*) from idempotency_keys where tenant_id=$1 and idempotency_key=$2)::int as keys",
      [tenant, key],
    );
    assert.deepEqual(counts.rows[0], { audits: 1, outbox: 1, keys: 1 });
  } finally {
    await c.end();
  }
});
