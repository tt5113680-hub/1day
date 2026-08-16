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
const base = 'http://127.0.0.1:3083';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3083',
    DATABASE_URL: db,
    AUTH_TOKEN_SECRET: 'g1-winf139-offers-rank-order',
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

test('G1-W139: static surface for offers module-click rank + reorder', () => {
  const c = read('apps/api/src/management-catalog.controller.ts');
  const s = read('apps/api/src/management-catalog.service.ts');
  const page = read('apps/management-web/app/m/offers/page.tsx');
  assert.match(c, /module-click-rank/);
  assert.match(c, /services\/reorder/);
  assert.match(s, /async moduleClickRank/);
  assert.match(s, /catalog_service_reorder/);
  assert.match(s, /async reorderServices/);
  assert.match(s, /catalog\.service\.reordered/);
  assert.match(page, /套餐模块点击排行/);
  assert.match(page, /模块点击排行/);
  assert.match(page, /套餐排序/);
  assert.match(page, /reorder/);
  assert.doesNotMatch(s, /Math\.random/);
});

test('G1-W139: module-click rank + reorder with real DB', async () => {
  await ready();
  const client = new Client({ connectionString: db });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const organization = randomUUID();
  const owner = { user: randomUUID(), membership: randomUUID(), employee: randomUUID() };
  const merchant = randomUUID();
  const store = randomUUID();
  const serviceA = randomUUID();
  const serviceB = randomUUID();
  const action = randomUUID();
  const offerA = randomUUID();
  const offerB = randomUUID();
  const urlA = `https://meituan.example.test/a-${stamp}`;
  const urlB = `https://douyin.example.test/b-${stamp}`;
  // ensure the reordered services start at fresh rank values on this store
  await client
    .query('update store_services set rank=0 where tenant_id=$1 and store_id=$2', [tenant, store])
    .catch(() => undefined);
  const baselineAudit = (
    await client.query(
      "select count(*)::int as c from audit_logs where action='catalog.service_reordered' and tenant_id=$1 and resource_id=$2",
      [tenant, store],
    )
  ).rows[0].c;
  const baselineOutbox = (
    await client.query(
      "select count(*)::int as c from outbox_events where event_type='catalog.service.reordered.v1' and tenant_id=$1 and aggregate_id=$2",
      [tenant, store],
    )
  ).rows[0].c;
  try {
    await client.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,$4,'team','active',null,null)",
      [organization, tenant, `o139-${stamp}`, `O139 ${stamp}`],
    );
    await client.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
      [owner.user, `U139-${stamp}@example.test`, 'U139 owner'],
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
      [owner.employee, tenant, owner.membership, organization, `E139-${stamp}`],
    );
    await client.query(
      "insert into merchants(id,tenant_id,organization_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,$5,'active',null,null)",
      [merchant, tenant, organization, `m139-${stamp}`, `M139 ${stamp}`],
    );
    await client.query(
      "insert into stores(id,tenant_id,organization_id,merchant_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,$5,$6,'active',null,null)",
      [store, tenant, organization, merchant, `s139-${stamp}`, `S139 ${stamp}`],
    );
    // two services on the store (rank 1 and 2)
    await client.query(
      `insert into store_services(id,tenant_id,store_id,code,name,description,duration_minutes,category,rank,status,created_by,updated_by)
       values($1,$2,$3,$4,$5,null,60,'套餐',1,'active',null,null),($6,$2,$3,$7,$8,null,60,'套餐',2,'active',null,null)`,
      [
        serviceA,
        tenant,
        store,
        `sa139-${stamp}`,
        `SA139 ${stamp}`,
        serviceB,
        `sb139-${stamp}`,
        `SB139 ${stamp}`,
      ],
    );
    // secure external actions (bound to the store via store_external_actions below)
    await client.query(
      `insert into external_actions(id,tenant_id,code,name,platform,action_type,status,target_url,created_by,updated_by)
       values($1,$2,$3,$4,'meituan','link','active',$5,null,null),($6,$2,$7,$8,'douyin','link','active',$9,null,null)`,
      [
        action,
        tenant,
        `EA139-A-${stamp}`,
        `EA139-A-${stamp}`,
        urlA,
        randomUUID(),
        `EA139-B-${stamp}`,
        `EA139-B-${stamp}`,
        urlB,
      ],
    );
    // the two external action ids need store_external_actions rows too
    const eaRows = await client.query(
      'select id from external_actions where tenant_id=$1 and name in ($2,$3)',
      [tenant, `EA139-A-${stamp}`, `EA139-B-${stamp}`],
    );
    const eaA = eaRows.rows[0].id;
    const eaB = eaRows.rows[1].id;
    await client.query(
      `insert into store_external_actions(id,tenant_id,store_id,external_action_id,enabled,sort_order,deleted_at,created_by,updated_by)
       values($1,$2,$3,$4,true,0,null,null,null),($5,$2,$3,$6,true,0,null,null,null)`,
      [randomUUID(), tenant, store, eaA, randomUUID(), eaB],
    );
    // offers linking services to actions
    await client.query(
      `insert into store_service_platform_offers(id,tenant_id,store_id,service_id,external_action_id,offer_price,market_price,currency,price_source,source_updated_at,sort_order,status,version,created_by,updated_by)
       values($1,$2,$3,$4,$5,99,0,'CNY','商户后台登记',now(),0,'active',1,null,null),
             ($6,$2,$3,$7,$8,88,0,'CNY','商户后台登记',now(),0,'active',1,null,null)`,
      [offerA, tenant, store, serviceA, eaA, offerB, serviceB, eaB],
    );

    const token = await login(`U139-${stamp}@example.test`);

    // --- module-click rank: seed click-family events attributed to offer A
    await client.query(
      `insert into entry_funnel_events(id,tenant_id,event_code,surface,actor_role,module_key,target_url,target_store_id,target_platform,source,scene,session_id,scroll_pct,dwell_ms,occurred_at)
       values
        (gen_random_uuid(),$1,'jump','store','anonymous','sa139-ent',$2,$3,'meituan','nearby','storefront',gen_random_uuid(),40,2000,now()),
        (gen_random_uuid(),$1,'jump_confirm','store','anonymous','sa139-ent',$2,$3,'meituan','nearby','storefront',gen_random_uuid(),10,1000,now()),
        (gen_random_uuid(),$1,'module_impression','store','anonymous',$4,null,$3,null,'nearby','storefront',gen_random_uuid(),20,500,now())`,
      [tenant, urlA, store, `EA139-A-${stamp}`],
    );

    const rankResponse = await fetch(
      `${base}/api/v1/management/catalog/module-click-rank?days=30`,
      {
        method: 'GET',
        headers: headers(token),
      },
    );
    assert.equal(rankResponse.status, 200);
    const rank = (await rankResponse.json()).data;
    const hit = rank.items.find((item) => item.serviceId === serviceA);
    assert.ok(hit, 'offer A service appears in module-click rank');
    assert.equal(hit.jumps, 1, 'one jump attributed');
    assert.equal(hit.jumpConfirms, 1, 'one jump_confirm attributed');
    assert.equal(hit.stationClicks, 0, 'no station click seeded for service A');
    assert.equal(hit.impressions, 1, 'one module_impression reference counted');
    assert.match(rank.disclaimer, /click/i);
    assert.match(rank.disclaimer, /source=local/);

    // --- reorder: put B > A by rank and persist
    const key = randomUUID();
    const reorder = await fetch(
      `${base}/api/v1/management/catalog/stores/${store}/services/reorder`,
      {
        method: 'POST',
        headers: headers(token, { 'idempotency-key': key }),
        body: JSON.stringify({ orderedIds: [serviceB, serviceA] }),
      },
    );
    assert.equal(reorder.status, 201, await reorder.clone().text());
    const reordered = (await reorder.json()).data;
    assert.equal(reordered.effected, 2, 'both seeded services reordered');

    const replay = await fetch(
      `${base}/api/v1/management/catalog/stores/${store}/services/reorder`,
      {
        method: 'POST',
        headers: headers(token, { 'idempotency-key': key }),
        body: JSON.stringify({ orderedIds: [serviceB, serviceA] }),
      },
    );
    assert.equal(replay.status, 201);
    assert.equal((await replay.json()).data.effected, 2, 'idempotent replay returns same');

    const rankRows = await client.query(
      'select id,rank from store_services where tenant_id=$1 and id=any($2::uuid[])',
      [tenant, [serviceA, serviceB]],
    );
    const byId = Object.fromEntries(rankRows.rows.map((row) => [row.id, row.rank]));
    assert.ok(byId[serviceB] > byId[serviceA], 'service B ranked above service A after reorder');

    const audit = await client.query(
      "select count(*)::int as c from audit_logs where action='catalog.service_reordered' and tenant_id=$1 and resource_id=$2",
      [tenant, store],
    );
    assert.equal(audit.rows[0].c, baselineAudit + 1, 'one batch audit written');
    const outbox = await client.query(
      "select count(*)::int as c from outbox_events where event_type='catalog.service.reordered.v1' and tenant_id=$1 and aggregate_id=$2",
      [tenant, store],
    );
    assert.equal(outbox.rows[0].c, baselineOutbox + 1, 'one batch outbox written');

    const invalid = await fetch(
      `${base}/api/v1/management/catalog/stores/${store}/services/reorder`,
      {
        method: 'POST',
        headers: headers(token, { 'idempotency-key': randomUUID() }),
        body: JSON.stringify({ orderedIds: [] }),
      },
    );
    assert.equal(invalid.status, 400, await invalid.clone().text());
  } finally {
    await client
      .query(
        'delete from entry_funnel_events where tenant_id=$1 and (module_key=$2 or target_url=$3)',
        [tenant, `sa139-ent`, urlA],
      )
      .catch(() => undefined);
    await client
      .query('delete from store_service_platform_offers where id=any($1::uuid[])', [
        [offerA, offerB],
      ])
      .catch(() => undefined);
    await client
      .query('delete from store_external_actions where tenant_id=$1 and store_id=$2', [
        tenant,
        store,
      ])
      .catch(() => undefined);
    await client
      .query("delete from external_actions where tenant_id=$1 and name like 'EA139-%'", [tenant])
      .catch(() => undefined);
    await client
      .query('delete from store_services where id=any($1::uuid[])', [[serviceA, serviceB]])
      .catch(() => undefined);
    await client.query('delete from stores where id=$1', [store]).catch(() => undefined);
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
