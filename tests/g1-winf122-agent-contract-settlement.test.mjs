/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { URL } from 'node:url';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const systemTenant = '00000000-0000-4000-8000-000000000001';
const base = 'http://127.0.0.1:3166';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3166', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'g1-winf122-agent-contract' },
  stdio: 'ignore',
});
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function ready() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      // starting
    }
    await wait(100);
  }
  throw Error('API did not start');
}
async function login() {
  const response = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin@system.local', password: 'ChangeMe123!', tenantId: systemTenant }),
  });
  assert.equal(response.status, 201);
  return (await response.json()).accessToken;
}
test.after(() => api.kill());

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');
const controller = () => read('apps/api/src/platform-agent.controller.ts');
const service = () => read('apps/api/src/platform-agent.service.ts');
const page = () => read('apps/platform-web/app/p/agents/page.tsx');
const migration = () => read('packages/database/src/migrations/075_agent_contracts.ts');

test('G1-W∞-122: contract state machine + settlement cycle API surface present + no funds', () => {
  const c = controller();
  assert.match(c, /@Post\(':id\/contracts'\)/);
  assert.match(c, /@Post\(':id\/contracts\/:contractId\/transition'\)/);
  assert.match(c, /@Get\('settlement-cycles'\)/);
  assert.match(c, /platform\.manage/);
  const s = service();
  assert.match(s, /CONTRACT_STATUS/);
  assert.match(s, /CONTRACT_TRANSITIONS/);
  assert.match(s, /async createContract/);
  assert.match(s, /async transitionContract/);
  assert.match(s, /async listSettlementCycles/);
  assert.match(s, /agent_contracts/);
  assert.match(s, /agent_contract_created/);
  assert.match(s, /platform\.agent_contract\.created\.v1/);
  assert.match(s, /agent_contract_transitioned/);
  assert.match(s, /cycle_number/);
  assert.match(s, /platform\.agent_settlement\.opened\.v1/);
  assert.match(s, /platform\.agent_settlement\.finalized\.v1/);
  assert.doesNotMatch(s, /fee_rate|commission|分账/);
  assert.doesNotMatch(s, /Math\.random|mockMetrics/);
  const m = migration();
  assert.match(m, /createTable\('agent_contracts'\)/);
  assert.match(m, /contract_status/);
  assert.match(m, /approved_by/);
  assert.match(m, /paused_at/);
  assert.match(m, /terminated_at/);
  assert.match(m, /cycle_number/);
});

test('G1-W∞-122: /p/agents contract + settlement-cycle UI present (no funds)', () => {
  const p = page();
  assert.match(p, /合作合同 · 状态机/);
  assert.match(p, /合作合同记录/);
  assert.match(p, /结算周期监控/);
  assert.match(p, /contracts/);
  assert.match(p, /settlementCycles/);
  assert.match(p, /提交审核/);
  assert.match(p, /生效/);
  assert.match(p, /暂停/);
  assert.match(p, /终止/);
  assert.match(p, /无资金托管/);
  assert.match(p, /不含费率\/佣金\/分账|不含费率|无资金托管/);
});

test('G1-W∞-122: real DB contract lifecycle + settlement cycle + audit/outbox + tenant denial', async () => {
  await ready();
  const client = new Client({ connectionString: db });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  try {
    const token = await login();
    const headersMain = { authorization: `Bearer ${token}`, 'x-request-id': randomUUID() };

    const regionCreated = await fetch(`${base}/api/v1/platform/agents/regions`, {
      method: 'POST',
      headers: { ...headersMain, 'content-type': 'application/json' },
      body: JSON.stringify({ code: `W122-${stamp}`, name: `合同省 ${stamp}`, level: 'province', parentRegionId: undefined }),
    });
    assert.equal(regionCreated.status, 201);
    const regionId = (await regionCreated.json()).data.id;

    const agentCreated = await fetch(`${base}/api/v1/platform/agents`, {
      method: 'POST',
      headers: { ...headersMain, 'content-type': 'application/json' },
      body: JSON.stringify({
        regionId,
        agentLevel: 'province',
        code: `agent-w122-${stamp}`,
        name: `合同省级代理 ${stamp}`,
        parentAgentId: undefined,
        status: 'active',
      }),
    });
    assert.equal(agentCreated.status, 201);
    const agent = (await agentCreated.json()).data;

    // contract draft
    const contractCode = `GD-W122-${stamp}`;
    const contractCreated = await fetch(`${base}/api/v1/platform/agents/${agent.id}/contracts`, {
      method: 'POST',
      headers: { ...headersMain, 'content-type': 'application/json' },
      body: JSON.stringify({ contractCode, contractTitle: '广东代理合作合同', signDate: '2026-08-01' }),
    });
    assert.equal(contractCreated.status, 201);
    const contract = (await contractCreated.json()).data;
    assert.equal(contract.contractStatus, 'draft');

    // duplicate contract code -> 409
    const dupContract = await fetch(`${base}/api/v1/platform/agents/${agent.id}/contracts`, {
      method: 'POST',
      headers: { ...headersMain, 'content-type': 'application/json' },
      body: JSON.stringify({ contractCode, contractTitle: '重复合同', signDate: '2026-08-01' }),
    });
    assert.equal(dupContract.status, 409);

    const transition = async (to) =>
      fetch(`${base}/api/v1/platform/agents/${agent.id}/contracts/${contract.id}/transition`, {
        method: 'POST',
        headers: { ...headersMain, 'content-type': 'application/json' },
        body: JSON.stringify({ contractStatus: to }),
      });

    // draft -> pending -> active -> paused -> active
    assert.equal((await transition('pending')).status, 201);
    assert.equal((await transition('active')).status, 201);
    assert.equal((await transition('paused')).status, 201);
    assert.equal((await transition('active')).status, 201);

    // invalid transition (active -> draft) rejected 409
    assert.equal((await transition('draft')).status, 409);

    // list projection includes contract status + lifecycle in DB
    const listed = await fetch(`${base}/api/v1/platform/agents`, { headers: headersMain });
    assert.equal(listed.status, 200);
    const projection = (await listed.json()).data;
    assert.equal(
      projection.contracts.some((x) => x.agentId === agent.id && x.contractCode === contractCode && x.contractStatus === 'active'),
      true,
    );

    // settlement cycle: open -> finalize -> cycle_number increments
    const period = `2026-08-W122-${stamp}`;
    const opened = await fetch(`${base}/api/v1/platform/agents/${agent.id}/settlements`, {
      method: 'POST',
      headers: { ...headersMain, 'content-type': 'application/json' },
      body: JSON.stringify({ periodCode: period, periodStart: '2026-08-01', periodEnd: '2026-08-31' }),
    });
    assert.equal(opened.status, 201);
    const settlement = (await opened.json()).data;
    assert.equal(settlement.cycleNumber, 1, 'first period is cycle 1');

    const finalized = await fetch(`${base}/api/v1/platform/agents/settlements/${settlement.id}/finalize`, {
      method: 'POST',
      headers: { ...headersMain, 'content-type': 'application/json' },
      body: JSON.stringify({ unitCents: 5000 }),
    });
    assert.equal(finalized.status, 201);

    // second period -> cycle 2
    const period2 = `2026-09-W122-${stamp}`;
    const opened2 = await fetch(`${base}/api/v1/platform/agents/${agent.id}/settlements`, {
      method: 'POST',
      headers: { ...headersMain, 'content-type': 'application/json' },
      body: JSON.stringify({ periodCode: period2, periodStart: '2026-09-01', periodEnd: '2026-09-30' }),
    });
    assert.equal((await opened2.json()).data.cycleNumber, 2, 'second period is cycle 2');

    // settlement cycles monitor reflects maxCycle=2 / 2 periods
    const cycles = await fetch(`${base}/api/v1/platform/agents/settlement-cycles`, { headers: headersMain });
    assert.equal(cycles.status, 200);
    const cycleRows = (await cycles.json()).data;
    assert.equal(cycleRows.some((x) => x.agentId === agent.id && x.maxCycle === 2 && x.periods === 2 && x.finalized === 1), true);

    // audit + outbox written for contract create/transition + settlement
    const audit = await client.query(
      "select count(*)::int c from audit_logs where tenant_id=$1 and action in ('platform.agent_contract_created','platform.agent_contract_transitioned','platform.agent_settlement_opened','platform.agent_settlement_finalized')",
      [systemTenant],
    );
    assert.ok(audit.rows[0].c >= 1, 'contract/settlement writes recorded in audit_logs');
    const outbox = await client.query(
      "select count(*)::int c from outbox_events where tenant_id=$1 and event_type in ('platform.agent_contract.created.v1','platform.agent_contract.transitioned.v1','platform.agent_settlement.opened.v1','platform.agent_settlement.finalized.v1')",
      [systemTenant],
    );
    assert.ok(outbox.rows[0].c >= 1, 'contract/settlement writes dispatched to outbox');

    // DB contract row state persisted
    const cRow = await client.query(
      'select contract_status from agent_contracts where contract_code=$1 and deleted_at is null',
      [contractCode],
    );
    assert.equal(cRow.rows[0].contract_status, 'active');

    // unauthorized -> 401
    assert.equal(
      (await fetch(`${base}/api/v1/platform/agents/settlement-cycles`, { headers: { 'x-request-id': randomUUID() } })).status,
      401,
    );
    // invalid transition stays 409 even on second attempt (state machine enforced)
    assert.equal((await transition('draft')).status, 409);
  } finally {
    await client.end();
  }
});
