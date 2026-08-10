/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const base = 'http://127.0.0.1:3142';
const systemTenant = '00000000-0000-4000-8000-000000000001';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3142', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'page-p-agent-ops' },
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

test('platform agent deep ops: quota, settlement, onboarding approval', async () => {
  await ready();
  const client = new Client({ connectionString: db });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const merchantTenantId = randomUUID();
  const merchantSlug = `agent-ops-merchant-${stamp}`;
  const provinceId = randomUUID();
  await client.query(
    "insert into tenant_provisioning_runs(id,requested_by_tenant_id,source_mode,request_slug,idempotency_key,state,industry,plan,input,delivery,verification,correlation_id,created_by,updated_by) values($1,$2,'local',$3,$4,'ready','restaurant','starter','{}'::jsonb,'{}'::jsonb,'{}'::jsonb,$5,null,null)",
    [randomUUID(), systemTenant, `run-ops-${stamp}`, randomUUID(), randomUUID()],
  );
  await client.query(
    "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,'Ops merchant','active',null,null)",
    [merchantTenantId, merchantSlug],
  );
  try {
    const token = await login();
    const authHeaders = { authorization: `Bearer ${token}`, 'x-request-id': randomUUID() };

    // Create agent bound to a fresh province region.
    const regionCreated = await fetch(`${base}/api/v1/platform/agents/regions`, {
      method: 'POST',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      body: JSON.stringify({ code: `O-${stamp}`, name: `运营测试省 ${stamp}`, level: 'province', parentRegionId: undefined }),
    });
    assert.equal(regionCreated.status, 201);
    const regionId = (await regionCreated.json()).data.id;

    const agentCreated = await fetch(`${base}/api/v1/platform/agents`, {
      method: 'POST',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      body: JSON.stringify({
        regionId,
        agentLevel: 'province',
        code: `agent-ops-${stamp}`,
        name: `运营省级代理 ${stamp}`,
        parentAgentId: undefined,
        status: 'active',
      }),
    });
    assert.equal(agentCreated.status, 201);
    const agent = (await agentCreated.json()).data;

    // QUOTA: below used is fine (0 used), set a real quota.
    const setQuota = await fetch(`${base}/api/v1/platform/agents/${agent.id}/quota`, {
      method: 'POST',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      body: JSON.stringify({ merchantQuota: 5 }),
    });
    assert.equal(setQuota.status, 201);
    assert.equal((await setQuota.json()).data.merchantQuota, 5);

    // QUOTA below used -> 400 (affiliate 1 merchant then try quota 0).
    await fetch(`${base}/api/v1/platform/agents/${agent.id}/affiliate`, {
      method: 'POST',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      body: JSON.stringify({ merchantTenantId }),
    });
    const belowUsed = await fetch(`${base}/api/v1/platform/agents/${agent.id}/quota`, {
      method: 'POST',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      body: JSON.stringify({ merchantQuota: 0 }),
    });
    assert.equal(belowUsed.status, 400);

    // SETTLEMENT: open a period, finalize by merchant count.
    const period = `2026-08-${stamp}`;
    const opened = await fetch(`${base}/api/v1/platform/agents/${agent.id}/settlements`, {
      method: 'POST',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      body: JSON.stringify({ periodCode: period, periodStart: '2026-08-01', periodEnd: '2026-08-31' }),
    });
    assert.equal(opened.status, 201);
    const settlement = (await opened.json()).data;
    assert.equal(settlement.settlementStatus, 'open');

    // duplicate settlement period -> 409
    const dupPeriod = await fetch(`${base}/api/v1/platform/agents/${agent.id}/settlements`, {
      method: 'POST',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      body: JSON.stringify({ periodCode: period, periodStart: '2026-08-01', periodEnd: '2026-08-31' }),
    });
    assert.equal(dupPeriod.status, 409);

    // finalize with unit 100 yuan = 10000 cents, 1 affiliated merchant -> 10000
    const finalized = await fetch(`${base}/api/v1/platform/agents/settlements/${settlement.id}/finalize`, {
      method: 'POST',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      body: JSON.stringify({ unitCents: 10000 }),
    });
    assert.equal(finalized.status, 201);
    const finalData = (await finalized.json()).data;
    assert.equal(finalData.merchantCount, 1);
    assert.equal(Number(finalData.amountCents), 10000);

    // finalizing again -> 409
    const reFinalize = await fetch(`${base}/api/v1/platform/agents/settlements/${settlement.id}/finalize`, {
      method: 'POST',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      body: JSON.stringify({ unitCents: 10000 }),
    });
    assert.equal(reFinalize.status, 409);

    // APPROVAL: request a second merchant, then approve.
    const merchant2 = randomUUID();
    await client.query(
      "insert into tenant_provisioning_runs(id,requested_by_tenant_id,source_mode,request_slug,idempotency_key,state,industry,plan,input,delivery,verification,correlation_id,created_by,updated_by) values($1,$2,'local',$3,$4,'ready','restaurant','starter','{}'::jsonb,'{}'::jsonb,'{}'::jsonb,$5,null,null)",
      [randomUUID(), systemTenant, `run-ops2-${stamp}`, randomUUID(), randomUUID()],
    );
    await client.query(
      "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,'Ops merchant 2','active',null,null)",
      [merchant2, `agent-ops2-${stamp}`],
    );
    const requested = await fetch(`${base}/api/v1/platform/agents/${agent.id}/approvals`, {
      method: 'POST',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      body: JSON.stringify({ merchantTenantId: merchant2 }),
    });
    assert.equal(requested.status, 201);
    const approval = (await requested.json()).data;
    assert.equal(approval.approvalStatus, 'pending');

    // duplicate approval -> 409
    const dupApproval = await fetch(`${base}/api/v1/platform/agents/${agent.id}/approvals`, {
      method: 'POST',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      body: JSON.stringify({ merchantTenantId: merchant2 }),
    });
    assert.equal(dupApproval.status, 409);

    // approve -> merchant is affiliated
    const decided = await fetch(`${base}/api/v1/platform/agents/approvals/${approval.id}/decide`, {
      method: 'POST',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      body: JSON.stringify({ approvalStatus: 'approved' }),
    });
    assert.equal(decided.status, 201);
    assert.equal((await decided.json()).data.approvalStatus, 'approved');

    // approving again -> 409 (no longer pending)
    const reDecide = await fetch(`${base}/api/v1/platform/agents/approvals/${approval.id}/decide`, {
      method: 'POST',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      body: JSON.stringify({ approvalStatus: 'approved' }),
    });
    assert.equal(reDecide.status, 409);

    // list projection includes quota/settlement/approval
    const listed = await fetch(`${base}/api/v1/platform/agents`, { headers: authHeaders });
    assert.equal(listed.status, 200);
    const projection = (await listed.json()).data;
    assert.equal(projection.quotas.some((q) => q.agentId === agent.id && q.merchantQuota === 5), true);
    assert.equal(
      projection.settlements.some(
        (s) => s.agentId === agent.id && s.periodCode === period && s.settlementStatus === 'finalized',
      ),
      true,
    );
    assert.equal(
      projection.approvals.some(
        (o) => o.agentId === agent.id && o.merchantTenantId === merchant2 && o.approvalStatus === 'approved',
      ),
      true,
    );
    // approval approval auto-affiliated merchant (merchant2 now affiliated)
    assert.equal(projection.agents.some((a) => a.id === agent.id && a.merchantCount === 2), true);

    // DB persistence
    const counts = await client.query(
      "select (select count(*)::int from agent_quotas where agent_id=$1)::int quotas,(select count(*)::int from agent_settlements where agent_id=$1 and settlement_status='finalized')::int settlements,(select count(*)::int from agent_onboarding_approvals where agent_id=$1 and approval_status='approved')::int approvals",
      [agent.id],
    );
    assert.deepEqual(counts.rows[0], { quotas: 1, settlements: 1, approvals: 1 });

    // authorization: no token -> 401
    assert.equal(
      (await fetch(`${base}/api/v1/platform/agents`, { headers: { 'x-request-id': randomUUID() } })).status,
      401,
    );
  } finally {
    await client.end();
  }
});
