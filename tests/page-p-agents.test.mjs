/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const base = 'http://127.0.0.1:3141';
const systemTenant = '00000000-0000-4000-8000-000000000001';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3141', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'page-p-agents' },
  stdio: 'ignore',
});
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
async function ready() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      // API is starting.
    }
    await wait(100);
  }
  throw Error('API did not start');
}
async function login() {
  const response = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@system.local',
      password: 'ChangeMe123!',
      tenantId: systemTenant,
    }),
  });
  assert.equal(response.status, 201);
  return (await response.json()).accessToken;
}
test.after(() => api.kill());

test('platform agents build 省市区代理 tree, affiliate merchants, and stay tenant-scoped', async () => {
  await ready();
  const client = new Client({ connectionString: db });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const merchantTenantId = randomUUID();
  const merchantSlug = `agent-merchant-${stamp}`;
  const provinceId = randomUUID();
  await client.query(
    "insert into tenant_provisioning_runs(id,requested_by_tenant_id,source_mode,request_slug,idempotency_key,state,industry,plan,input,delivery,verification,correlation_id,created_by,updated_by) values($1,$2,'local',$3,$4,'ready','restaurant','starter','{}'::jsonb,'{}'::jsonb,'{}'::jsonb,$5,null,null)",
    [randomUUID(), systemTenant, `run-${stamp}`, randomUUID(), randomUUID()],
  );
  await client.query(
    "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,'Agent merchant','active',null,null)",
    [merchantTenantId, merchantSlug],
  );
  try {
    const token = await login();
    const authHeaders = { authorization: `Bearer ${token}`, 'x-request-id': randomUUID() };

    // MP-01: list pulls the seeded demo geography.
    const seedList = await fetch(`${base}/api/v1/platform/agents`, { headers: authHeaders });
    assert.equal(seedList.status, 200);
    const seedProjection = (await seedList.json()).data;
    assert.equal(seedProjection.regions.some((r) => r.name === '广东省' && r.level === 'province'), true);

    // create a fresh province region
    const regionCreated = await fetch(`${base}/api/v1/platform/agents/regions`, {
      method: 'POST',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      body: JSON.stringify({ code: `A-${stamp}`, name: `澳门测试省 ${stamp}`, level: 'province', parentRegionId: undefined }),
    });
    assert.equal(regionCreated.status, 201);
    const region = (await regionCreated.json()).data;
    const regionId = region.id;

    // MP-01: create agent bound to that region
    const agentCreated = await fetch(`${base}/api/v1/platform/agents`, {
      method: 'POST',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      body: JSON.stringify({
        regionId,
        agentLevel: 'province',
        code: `agent-${stamp}`,
        name: `省级代理 ${stamp}`,
        parentAgentId: undefined,
        status: 'active',
      }),
    });
    assert.equal(agentCreated.status, 201);
    const agent = (await agentCreated.json()).data;
    assert.equal(agent.regionName, `澳门测试省 ${stamp}`);

    // MP-02: affiliate the merchant tenant to the agent
    const affiliated = await fetch(`${base}/api/v1/platform/agents/${agent.id}/affiliate`, {
      method: 'POST',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      body: JSON.stringify({ merchantTenantId }),
    });
    assert.equal(affiliated.status, 201);
    const affiliation = (await affiliated.json()).data;
    assert.equal(affiliation.merchantTenantId, merchantTenantId);
    assert.equal(affiliation.affiliationStatus, 'active');

    // duplicate affiliation conflict
    const dup = await fetch(`${base}/api/v1/platform/agents/${agent.id}/affiliate`, {
      method: 'POST',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      body: JSON.stringify({ merchantTenantId }),
    });
    assert.equal(dup.status, 409);

    // list projection includes the tree + affiliation
    const listed = await fetch(`${base}/api/v1/platform/agents`, { headers: authHeaders });
    assert.equal(listed.status, 200);
    const projection = (await listed.json()).data;
    assert.equal(projection.agents.some((a) => a.id === agent.id && a.merchantCount === 1), true);
    assert.equal(
      projection.affiliations.some(
        (af) => af.merchantTenantId === merchantTenantId && af.agentName === `省级代理 ${stamp}`,
      ),
      true,
    );
    // affiliated merchant no longer appears in the open merchant pool
    assert.equal(projection.merchantPool.some((m) => m.tenantId === merchantTenantId), false);
    // seeded demo region still present with its city child
    assert.equal(projection.regions.some((r) => r.code === 'GZ-CITY'), true);

    // DB persistence for the new chain
    const counts = await client.query(
      "select (select count(*) from agent_regions where id=$1)::int regions,(select count(*) from platform_agents where id=$2)::int agents,(select count(*) from agent_merchant_affiliations where agent_id=$2 and merchant_tenant_id=$3)::int affiliations",
      [regionId, agent.id, merchantTenantId],
    );
    assert.deepEqual(counts.rows[0], { regions: 1, agents: 1, affiliations: 1 });

    // authorization: no token -> 401; invalid region level -> 400
    assert.equal(
      (await fetch(`${base}/api/v1/platform/agents`, { headers: { 'x-request-id': randomUUID() } })).status,
      401,
    );
    const badLevel = await fetch(`${base}/api/v1/platform/agents/regions`, {
      method: 'POST',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      body: JSON.stringify({ code: `B-${stamp}`, name: 'x', level: 'planet', parentRegionId: undefined }),
    });
    assert.equal(badLevel.status, 400);
  } finally {
    await client.end();
  }
});
