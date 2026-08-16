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
const base = 'http://127.0.0.1:3084';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3084',
    DATABASE_URL: db,
    AUTH_TOKEN_SECRET: 'g1-winf141-employee-share-pairing',
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

test('G1-W∞-141: static surface — employee share pairing closed loop exposed + honest', () => {
  const svc = read('apps/api/src/employee-share.service.ts');
  const page = read('apps/employee-web/app/e/share/share-codes.tsx');
  assert.match(svc, /async pairing\(/);
  assert.match(svc, /entry_funnel_events/);
  assert.match(svc, /share_code=\$2/);
  assert.match(svc, /event_code='share_open'/);
  assert.match(svc, /回访/);
  assert.match(svc, /revisits/);
  assert.match(svc, /openToVisitRate/);
  assert.match(page, /分享配对明细/);
  assert.match(page, /打开→进店/);
  assert.match(page, /打开→出站/);
  assert.match(page, /回访（再次进入）/);
  assert.match(page, /data-testid="share-pairing-panel"/);
  assert.doesNotMatch(svc, /Math\.random/);
});

test('G1-W∞-141: pairing derives from real entry_funnel_events (single source, 禁止假 BI)', () => {
  const svc = read('apps/api/src/employee-share.service.ts');
  const page = read('apps/employee-web/app/e/share/share-codes.tsx');
  assert.match(svc, /occurred_at >= now\(\) - interval '30 days'/);
  assert.match(svc, /group by session_id having count\(\*\) > 1/);
  assert.match(svc, /disclaimer/);
  assert.match(page, /summaryStrip/);
  assert.match(page, /pairing\.totals\.opens/);
  assert.match(page, /pairing\.totals\.revisits/);
  assert.match(page, /pairing\.pairings\.map/);
  assert.doesNotMatch(page, /mockMetrics|Math\.random\(/);
});

test('G1-W∞-141: honest boundaries preserved on share pairing', () => {
  const page = read('apps/employee-web/app/e/share/share-codes.tsx');
  assert.match(page, /source=local/);
  assert.match(page, /非本平台下单/);
  assert.match(page, /不含支付金额/);
  assert.match(page, /不代表第三方成交/);
  assert.doesNotMatch(page, /本平台收款/);
});

test('G1-W∞-141: pairing aggregates round-trip with real DB (employee-scoped, fail-closed)', async () => {
  await ready();
  const client = new Client({ connectionString: db });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const organization = randomUUID();
  const worker = { user: randomUUID(), membership: randomUUID(), employee: randomUUID() };
  const other = { user: randomUUID(), membership: randomUUID(), employee: randomUUID() };
  const codeId = randomUUID();
  const otherCodeId = randomUUID();
  const code = `W141-${stamp}`;
  const codeOther = `W141-${stamp}-O`;
  const sessionId = randomUUID();
  const session2 = randomUUID();
  try {
    await client.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,$4,'team','active',null,null)",
      [organization, tenant, `o141-${stamp}`, `O141 ${stamp}`],
    );
    for (const e of [worker, other]) {
      await client.query(
        "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
        [e.user, `E141-${stamp}-${e.employee}@example.test`, `E141 ${e.employee}`],
      );
      await client.query(
        "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
        [e.membership, tenant, e.user],
      );
      await client.query(
        'insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,$4)',
        [randomUUID(), tenant, e.membership, '00000000-0000-4000-8000-000000000004'],
      );
      await client.query(
        "insert into employees(id,tenant_id,membership_id,organization_id,employee_code,title,status,created_by,updated_by) values($1,$2,$3,$4,$5,'Advisor','active',null,null)",
        [e.employee, tenant, e.membership, organization, `E141E-${e.employee}`],
      );
    }
    // worker's share code
    await client.query(
      `insert into employee_share_codes(id,tenant_id,employee_id,code,scenario,target_path,created_by,updated_by)
       values($1,$2,$3,$4,'employee','/c/entry',$5,$5)`,
      [codeId, tenant, worker.employee, code, worker.user],
    );
    // another employee's code (ownership deny target)
    await client.query(
      `insert into employee_share_codes(id,tenant_id,employee_id,code,scenario,target_path,created_by,updated_by)
       values($1,$2,$3,$4,'employee','/c/entry',$5,$5)`,
      [otherCodeId, tenant, other.employee, codeOther, other.user],
    );
    // funnel: employee share sent + opens + visit + jump (exactly what the service emits / consumer emits)
    const emit = async (eventCode, actorRole, shareCode, session, surface, device, extra = {}) =>
      client.query(
        `insert into entry_funnel_events(
           id, tenant_id, actor_role, event_code, surface, module_key, source, scene,
           share_code, session_id, device, occurred_at
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now())`,
        [
          randomUUID(),
          tenant,
          actorRole,
          eventCode,
          surface,
          'share_landing',
          'employee_share',
          String(extra.scene ?? 'employee_share'),
          shareCode,
          session,
          device,
        ],
      );
    await emit('share', 'employee', code, sessionId, 'share', 'mobile');
    await emit('share_open', 'anonymous', code, sessionId, 'share', 'h5');
    await emit('visit', 'anonymous', code, sessionId, 'entry', 'h5');
    await emit('jump', 'anonymous', code, sessionId, 'entry', 'h5');
    // revisit: same session a second open/visit
    await emit('share_open', 'anonymous', code, session2, 'entry', 'pc');
    await emit('visit', 'anonymous', code, session2, 'entry', 'pc');

    const token = await login(`E141-${stamp}-${worker.employee}@example.test`);
    const response = await fetch(`${base}/api/v1/employee/share-codes/${codeId}/pairing`, {
      method: 'GET',
      headers: headers(token),
    });
    assert.equal(response.status, 200, await response.clone().text());
    const data = (await response.json()).data;
    assert.equal(data.code, code);
    assert.equal(data.scenario, 'employee');
    assert.equal(data.totals.opens, 2, 'two share_open events');
    assert.equal(data.totals.entryVisits, 2, 'two visit events');
    assert.equal(data.totals.jumps, 1, 'one jump event');
    assert.ok(data.totals.openToVisitRate > 0, 'open->visit rate derived');
    assert.ok(data.totals.openToJumpRate > 0, 'open->jump rate derived');
    assert.ok(data.totals.revisits >= 1, 'revisit detected from multi-entry session');
    assert.ok(Array.isArray(data.byDate), 'time series returned');
    assert.ok(Array.isArray(data.pairings), 'recent pairings returned');
    assert.ok(data.pairings.length >= 2, 'pairing rows present');
    assert.ok(data.disclaimer, 'honest disclaimer present');

    // ownership deny: worker cannot read another employee's share code pairing
    const denied = await fetch(`${base}/api/v1/employee/share-codes/${otherCodeId}/pairing`, {
      method: 'GET',
      headers: headers(token),
    });
    assert.ok([401, 403, 404].includes(denied.status), 'cross-owner pairing denied');
  } finally {
    await client
      .query('delete from entry_funnel_events where tenant_id=$1 and share_code in ($2,$3)', [
        tenant,
        code,
        codeOther,
      ])
      .catch(() => undefined);
    await client
      .query('delete from employee_share_codes where id in ($1,$2)', [codeId, otherCodeId])
      .catch(() => undefined);
    for (const e of [worker, other]) {
      await client
        .query('delete from auth_sessions where user_id=$1', [e.user])
        .catch(() => undefined);
      await client.query('delete from employees where id=$1', [e.employee]).catch(() => undefined);
      await client
        .query('delete from membership_roles where membership_id=$1', [e.membership])
        .catch(() => undefined);
      await client
        .query('delete from memberships where id=$1', [e.membership])
        .catch(() => undefined);
      await client.query('delete from users where id=$1', [e.user]).catch(() => undefined);
      await client
        .query('delete from organizations where id=$1', [organization])
        .catch(() => undefined);
    }
    await client.end();
  }
});
