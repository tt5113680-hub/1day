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
const base = 'http://127.0.0.1:3084';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3084',
    DATABASE_URL: db,
    AUTH_TOKEN_SECRET: 'management-offer-depth-112',
  },
  stdio: 'ignore',
});
const headers = (token, extra = {}) => ({
  authorization: `Bearer ${token}`,
  'x-request-id': randomUUID(),
  ...extra,
});
const jsonHeaders = (token, extra = {}) => ({
  ...headers(token, extra),
  'content-type': 'application/json',
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
test('G1-W112: offer category tree + batch status + jump rank with real DB', async () => {
  await ready();
  const client = new Client({ connectionString: db });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const organization = randomUUID();
  const owner = { user: randomUUID(), membership: randomUUID(), employee: randomUUID() };
  const merchant = randomUUID();
  const store = randomUUID();
  try {
    await client.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,$4,'team','active',null,null)",
      [organization, tenant, `od-org-${stamp}`, `Offer org ${stamp}`],
    );
    await client.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
      [owner.user, `ODOWN-${stamp}@example.test`, 'Offer depth owner'],
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
      [owner.employee, tenant, owner.membership, organization, `ODE-${stamp}`],
    );
    await client.query(
      "insert into merchants(id,tenant_id,organization_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,$5,'active',null,null)",
      [merchant, tenant, organization, `ODM-${stamp}`, `W112 merchant ${stamp}`],
    );
    await client.query(
      "insert into stores(id,tenant_id,organization_id,merchant_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,$5,$6,'active',null,null)",
      [store, tenant, organization, merchant, `OD-BASE-${stamp}`, `Base store ${stamp}`],
    );
    // two services in same store with a category
    const svcA = randomUUID();
    const svcB = randomUUID();
    await client.query(
      "insert into store_services(id,tenant_id,store_id,code,name,description,category,price_label,rank,status,created_by,updated_by) values($1,$2,$3,$4,$5,null,$6,$7,1,'active',null,null)",
      [svcA, tenant, store, `OD-SVA-${stamp}`, `Service A ${stamp}`, '团购套餐', '¥100'],
    );
    await client.query(
      "insert into store_services(id,tenant_id,store_id,code,name,description,category,price_label,rank,status,created_by,updated_by) values($1,$2,$3,$4,$5,null,$6,$7,1,'active',null,null)",
      [svcB, tenant, store, `OD-SVB-${stamp}`, `Service B ${stamp}`, '到店服务', '¥50'],
    );
    // external action + offer on svcA
    const action = randomUUID();
    await client.query(
      "insert into external_actions(id,tenant_id,code,name,action_type,target_url,platform,status,created_by,updated_by) values($1,$2,$3,$4,'link',$5,$6,'active',null,null)",
      [
        action,
        tenant,
        `OD-ACT-${stamp}`,
        `Meituan deal ${stamp}`,
        `https://m.example.com/deal-${stamp}`,
        'meituan',
      ],
    );
    await client.query(
      'insert into store_external_actions(id,tenant_id,store_id,external_action_id,sort_order,enabled,created_by,updated_by) values($1,$2,$3,$4,0,true,null,null)',
      [randomUUID(), tenant, store, action],
    );
    await client.query(
      "insert into store_service_platform_offers(id,tenant_id,store_id,service_id,external_action_id,offer_price,currency,price_source,status,created_by,updated_by) values($1,$2,$3,$4,$5,$6,'CNY','商户后台登记','active',null,null)",
      [randomUUID(), tenant, store, svcA, action, 99],
    );
    // two jump events on svcA's action (one jump, one jump_confirm)
    await client.query(
      `insert into entry_funnel_events(id,tenant_id,event_code,surface,module_key,target_platform,target_url,target_store_id,actor_role)
       values($1,$2,'jump','store',$3,'meituan',$4,$5,'anonymous')`,
      [randomUUID(), tenant, `Meituan deal ${stamp}`, `https://m.example.com/deal-${stamp}`, store],
    );
    await client.query(
      `insert into entry_funnel_events(id,tenant_id,event_code,surface,module_key,target_platform,target_url,target_store_id,actor_role)
       values($1,$2,'jump_confirm','store','external_action_confirm','meituan',$3,$4,'anonymous')`,
      [randomUUID(), tenant, `https://m.example.com/deal-${stamp}`, store],
    );
    const ownerToken = await login(`ODOWN-${stamp}@example.test`);

    // cross-tenant guard on categories
    const guarded = await fetch(`${base}/api/v1/management/catalog/categories`, {
      headers: headers(ownerToken, { 'x-tenant-context': randomUUID() }),
    });
    assert.ok([403, 404].includes(guarded.status), 'wrong tenant denied (403/404, no leak)');

    // category tree returns grouped services
    const catResp = await fetch(`${base}/api/v1/management/catalog/categories`, {
      headers: headers(ownerToken),
    });
    assert.equal(catResp.status, 200);
    const catData = (await catResp.json()).data;
    const catGroups = catData.categories;
    const groupA = catGroups.find((g) => g.category === '团购套餐');
    const groupB = catGroups.find((g) => g.category === '到店服务');
    assert.ok(groupA && groupA.serviceCount >= 1, 'category 团购套餐 present');
    assert.ok(groupB && groupB.serviceCount >= 1, 'category 到店服务 present');
    assert.ok(
      groupA.services.some((s) => s.id === svcA),
      'service A grouped under 团购套餐',
    );

    // batch status: set svcB inactive
    const batchKey = randomUUID();
    const batch = await fetch(
      `${base}/api/v1/management/catalog/stores/${store}/services/batch-status`,
      {
        method: 'POST',
        headers: jsonHeaders(ownerToken, { 'idempotency-key': batchKey }),
        body: JSON.stringify({ storeId: store, serviceIds: [svcB], status: 'inactive' }),
      },
    );
    assert.equal(batch.status, 201);
    const batchData = (await batch.json()).data;
    assert.equal(batchData.effected, 1, 'one service batch-updated');
    assert.equal(batchData.status, 'inactive');
    // idempotent replay
    const batchReplay = await fetch(
      `${base}/api/v1/management/catalog/stores/${store}/services/batch-status`,
      {
        method: 'POST',
        headers: jsonHeaders(ownerToken, { 'idempotency-key': batchKey }),
        body: JSON.stringify({ storeId: store, serviceIds: [svcB], status: 'inactive' }),
      },
    );
    assert.equal(batchReplay.status, 201);
    assert.equal((await batchReplay.json()).data.effected, batchData.effected, 'idempotent replay');
    // DB reflects status
    const svcRow = await client.query(
      'select status from store_services where id=$1 and tenant_id=$2 and deleted_at is null',
      [svcB, tenant],
    );
    assert.equal(svcRow.rows[0].status, 'inactive');

    // jump rank: svcA has 1 jump (+1 confirm) -> jumps>=1
    const rankResp = await fetch(`${base}/api/v1/management/catalog/jump-rank?days=30`, {
      headers: headers(ownerToken),
    });
    assert.equal(rankResp.status, 200);
    const rankData = (await rankResp.json()).data;
    assert.ok(rankData.totalJumps >= 1, 'totalJumps >= 1 from real jump events');
    const svcARank = rankData.items.find((i) => i.serviceId === svcA);
    assert.ok(svcARank && svcARank.jumps >= 1, 'Service A jump-ranked with >=1 jump');
    assert.ok(svcARank.jumpConfirms >= 1, 'Service A confirm count >=1');

    // audit + outbox for batch action
    const audit = await client.query(
      "select action from audit_logs where tenant_id=$1 and resource_type='commercial_catalog' and resource_id=$2 and action like 'catalog.service_batch_%'",
      [tenant, store],
    );
    assert.ok(
      audit.rows.some((r) => r.action === 'catalog.service_batch_inactive'),
      'audit catalog.service_batch_inactive',
    );
    const outbox = await client.query(
      "select event_type from outbox_events where tenant_id=$1 and aggregate_type='commercial_catalog' and aggregate_id=$2 and event_type like 'catalog.service.batch_%'",
      [tenant, store],
    );
    assert.ok(
      outbox.rows.some((r) => r.event_type === 'catalog.service.batch_inactive.v1'),
      'outbox catalog.service.batch_inactive.v1',
    );
  } finally {
    await client.end();
  }
});
