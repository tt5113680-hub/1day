/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test',
  base = 'http://127.0.0.1:3029';
const requireFromApi = createRequire(new URL('../apps/api/package.json', import.meta.url)),
  { Client } = requireFromApi('pg');
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3029', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'page-c-consumer-search' },
  stdio: 'ignore',
});
const request = (path) => fetch(base + path);
async function ready() {
  for (let index = 0; index < 30; index += 1) {
    try {
      if ((await request('/api/v1/health')).ok) return;
    } catch {
      /* starting */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw Error('API not ready');
}
test.after(() => api.kill());
test('consumer search returns only the tenant matching merchants with a published store and isolates tenants', async () => {
  await ready();
  const stamp = Date.now(),
    client = new Client({ connectionString: db });
  await client.connect();
  const matchedMerchant = randomUUID(),
    otherMerchant = randomUUID(),
    isolatedMerchant = randomUUID(),
    matchedStore = randomUUID(),
    otherStore = randomUUID();
  const matchedName = `搜索幸福面馆-${stamp}`,
    otherName = `普通茶铺-${stamp}`,
    isolatedName = `隔离商户-${stamp}`;
  const isolatedTenant = randomUUID();
  try {
    const organization = (
      await client.query('select id from organizations where tenant_id=$1 and status=$2 limit 1', [
        '00000000-0000-4000-8000-000000000001',
        'active',
      ])
    ).rows[0]?.id;
    assert.ok(organization);
    await client.query(
      "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [isolatedTenant, `search-isolated-${stamp}`, 'Search isolated'],
    );
    const isolatedOrg = randomUUID();
    await client.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,$4,'company','active',null,null)",
      [isolatedOrg, isolatedTenant, `search-iso-org-${stamp}`, 'Search isolated org'],
    );
    for (const [id, code, name, tenantId, orgId] of [
      [matchedMerchant, `search-hit-${stamp}`, matchedName, '00000000-0000-4000-8000-000000000001', organization],
      [otherMerchant, `search-other-${stamp}`, otherName, '00000000-0000-4000-8000-000000000001', organization],
      [isolatedMerchant, `search-iso-${stamp}`, isolatedName, isolatedTenant, isolatedOrg],
    ]) {
      await client.query(
        "insert into merchants(id,tenant_id,organization_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,$5,'active',null,null)",
        [id, tenantId, orgId, code, name],
      );
    }
    const isolatedStore = randomUUID();
    for (const [id, merchantId, code, tenantId, orgId] of [
      [matchedStore, matchedMerchant, `search-hit-store-${stamp}`, '00000000-0000-4000-8000-000000000001', organization],
      [otherStore, otherMerchant, `search-other-store-${stamp}`, '00000000-0000-4000-8000-000000000001', organization],
      [isolatedStore, isolatedMerchant, `search-iso-store-${stamp}`, isolatedTenant, isolatedOrg],
    ]) {
      await client.query(
        "insert into stores(id,tenant_id,organization_id,merchant_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,$5,$6,'active',null,null)",
        [id, tenantId, orgId, merchantId, code, `${code}-store`],
      );
    }
  } finally {
    await client.end();
  }
  const hitResponse = await request(
    `/api/v1/consumer/search?tenant=system&q=${encodeURIComponent('幸福面馆')}`,
  );
  assert.equal(hitResponse.status, 200);
  const hit = (await hitResponse.json()).data;
  assert.equal(hit.query, '幸福面馆');
  assert.equal(hit.items.some((item) => item.name === matchedName), true);
  assert.equal(hit.items.find((item) => item.id === matchedMerchant).entryUrl, `/c/stores/${matchedStore}?tenant=system`);
  assert.equal(hit.items.some((item) => item.name === otherName), false);
  const otherResponse = await request(
    `/api/v1/consumer/search?tenant=system&q=${encodeURIComponent('茶铺')}`,
  );
  assert.equal(otherResponse.status, 200);
  assert.equal((await otherResponse.json()).data.items.some((item) => item.name === otherName), true);
  const isolatedResponse = await request(
    `/api/v1/consumer/search?tenant=system&q=${encodeURIComponent('隔离商户')}`,
  );
  assert.equal(isolatedResponse.status, 200);
  assert.equal((await isolatedResponse.json()).data.items.some((item) => item.name === isolatedName), false);
  assert.equal(
    (await request('/api/v1/consumer/search?tenant=system&q=')).status,
    400,
  );
  assert.equal(
    (await request(`/api/v1/consumer/search?tenant=system&q=${encodeURIComponent('幸福面馆')}&latitude=31.2`)).status,
    400,
  );
  assert.equal(
    (await request(`/api/v1/consumer/search?tenant=missing-search-tenant&q=${encodeURIComponent('幸福面馆')}`)).status,
    404,
  );
});
