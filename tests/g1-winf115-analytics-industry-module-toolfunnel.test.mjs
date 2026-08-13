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

const service = () => read('apps/api/src/entry-funnel.service.ts');
const controller = () => read('apps/api/src/entry-funnel.controller.ts');
const page = () => read('apps/management-web/app/m/analytics/page.tsx');
const css = () => read('apps/management-web/app/m/analytics/page.module.css');

test('G1-W115: service exposes tool-funnel + module-heat real-data read methods', () => {
  const s = service();
  assert.match(s, /async toolFunnel/);
  assert.match(s, /async moduleHeat/);
  assert.match(s, /tool funnel: Consult/);
  assert.match(s, /consumer_action_events/);
  assert.match(s, /consumer_action_redirect_events/);
  assert.match(s, /from customers\s+where/);
  assert.match(s, /tenant_id=\$1/);
  assert.match(s, /from tasks t/);
  assert.match(s, /from entry_funnel_events/);
  assert.match(s, /module_key/);
  assert.match(s, /group by 1, 2/);
  assert.match(s, /未命名模块|coalesce\(nullif\(module_key/);
  assert.doesNotMatch(s, /Math\.random/);
});

test('G1-W115: controller exposes tool-funnel + module-heat GET endpoints (tenant.manage)', () => {
  const c = controller();
  assert.match(c, /management\/entry-funnel\/tool-funnel/);
  assert.match(c, /management\/entry-funnel\/module-heat/);
  assert.match(c, /@Get\('management\/entry-funnel\/tool-funnel'\)/);
  assert.match(c, /@Get\('management\/entry-funnel\/module-heat'\)/);
  assert.match(c, /@Query\('days'\)/);
  assert.match(c, /require\(authorization, 'tenant\.manage', tenant\)/);
});

test('G1-W115: /m/analytics adds industry template selector + focus-module heat', () => {
  const p = page();
  assert.match(p, /行业模板解读/);
  assert.match(p, /industryTemplates/);
  assert.match(p, /role="tab"/);
  assert.match(p, /选择行业模板/);
  assert.match(p, /setIndustryId/);
  assert.match(p, /聚焦模块/);
  assert.match(p, /模板解读（规则引擎）/);
  assert.match(p, /focusModules/);
  assert.match(p, /activeIndustry\.insights/);
  assert.match(p, /行业模板只按已抓取的 L0–L2 入口痕迹解读模块曝光与承接/);
  assert.match(p, /不编造成交、支付或第三方订单结果/);
});

test('G1-W115: /m/analytics adds module heat + tool funnel panels from real rows', () => {
  const p = page();
  const c = css();
  assert.match(p, /aria-label="模块热力"/);
  assert.match(p, /module-heat/);
  assert.match(p, /heat\.modules\.slice\(0, 24\)\.map/);
  assert.match(p, /heatIntensity/);
  assert.match(p, /module\.cells\.map/);
  assert.match(p, /模块热力仅统计 L0–L2\s+入口痕迹按模块聚合/);
  assert.match(p, /aria-label="工具漏斗"/);
  assert.match(p, /tool-funnel/);
  assert.match(p, /funnel\.stages\.map/);
  assert.match(p, /工具漏斗/);
  assert.match(p, /consultRate/);
  assert.match(p, /不含支付、成交金额或第三方订单结果/);
  for (const cls of [
    '.heatTable',
    '.heatBar',
    '.funnelBreakdown',
    '.funnelStage',
    '.industryTabs',
    '.tabActive',
  ]) {
    assert.match(c, new RegExp(cls.replace('.', '\\.')), `css has ${cls}`);
  }
});

test('G1-W115: honest source=local boundaries preserved, no fake BI', () => {
  const p = page();
  assert.match(p, /api\/v1\/management\/entry-funnel\/daily-report/);
  assert.match(p, /api\/v1\/management\/entry-funnel\/tool-funnel/);
  assert.match(p, /api\/v1\/management\/entry-funnel\/module-heat/);
  assert.match(p, /推广员工具 · 数据\/经营分析/);
  assert.match(p, /无权查看数据分析/);
  assert.doesNotMatch(p, /mockMetrics/);
  assert.doesNotMatch(p, /Math\.random/);
});

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
    AUTH_TOKEN_SECRET: 'management-analytics-w115',
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
test('G1-W115: tool-funnel + module-heat round-trip with real DB (consult→customer→task→done + module heat)', async () => {
  await ready();
  const client = new Client({ connectionString: db });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const organization = randomUUID();
  const owner = { user: randomUUID(), membership: randomUUID(), employee: randomUUID() };
  const store = randomUUID();
  const merchant = randomUUID();
  const action = randomUUID();
  const customerA = randomUUID();
  const customerB = randomUUID();
  const taskOpen = randomUUID();
  const taskDone = randomUUID();
  try {
    await client.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,'W115 org','team','active',null,null)",
      [organization, tenant, `w115-${stamp}`],
    );
    await client.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
      [owner.user, `W115OWN-${stamp}@example.test`, 'W115 owner'],
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
      [owner.employee, tenant, owner.membership, organization, `W115E-${stamp}`],
    );
    await client.query(
      "insert into merchants(id,tenant_id,organization_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,$5,'active',null,null)",
      [merchant, tenant, organization, `W115M-${stamp}`, `W115 merchant ${stamp}`],
    );
    await client.query(
      "insert into stores(id,tenant_id,organization_id,merchant_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,$5,$6,'active',null,null)",
      [store, tenant, organization, merchant, `W115S-${stamp}`, `W115 store ${stamp}`],
    );
    for (const customer of [customerA, customerB]) {
      await client.query(
        "insert into customers(id,tenant_id,display_name,status,created_by,updated_by) values($1,$2,'W115 customer','active',null,null)",
        [customer, tenant],
      );
    }
    // task on A (open) + A (completed) → A counts in with_task & done
    await client.query(
      "insert into tasks(id,tenant_id,customer_id,assignee_employee_id,title,due_at,status,created_by,updated_by) values($1,$2,$3,$4,'w115 open',now(),'open',null,null)",
      [taskOpen, tenant, customerA, owner.employee],
    );
    await client.query(
      "insert into tasks(id,tenant_id,customer_id,assignee_employee_id,title,due_at,status,updated_at,created_by,updated_by) values($1,$2,$3,$4,'w115 done',now(),'completed',now(),null,null)",
      [taskDone, tenant, customerA, owner.employee],
    );
    // external action + a consult event (consult inflow)
    await client.query(
      "insert into external_actions(id,tenant_id,code,name,action_type,target_url,platform,status,created_by,updated_by) values($1,$2,$3,$4,'consult','https://example.test','meituan','active',null,null)",
      [action, tenant, `w115a-${stamp}`, `W115 action ${stamp}`],
    );
    await client.query(
      "insert into consumer_action_events(id,tenant_id,store_id,external_action_id,source,idempotency_key,created_by,updated_by) values($1,$2,$3,$4,'w115',$5,null,null)",
      [randomUUID(), tenant, store, action, `w115-key-${stamp}`],
    );
    // module heat rows: module_key A (module_impression + consult_click) and B (visit)
    await client.query(
      "insert into entry_funnel_events(id,tenant_id,event_code,surface,module_key,occurred_at) values($1,$2,'module_impression','store',$3,now())",
      [randomUUID(), tenant, 'offer_compare'],
    );
    await client.query(
      "insert into entry_funnel_events(id,tenant_id,event_code,surface,module_key,occurred_at) values($1,$2,'consult_click','store',$3,now())",
      [randomUUID(), tenant, 'offer_compare'],
    );
    await client.query(
      "insert into entry_funnel_events(id,tenant_id,event_code,surface,module_key,occurred_at) values($1,$2,'visit','store',$3,now())",
      [randomUUID(), tenant, 'member_entry'],
    );

    const ownerToken = await login(`W115OWN-${stamp}@example.test`);

    // cross-tenant guard
    const guarded = await fetch(`${base}/api/v1/management/entry-funnel/tool-funnel`, {
      headers: headers(ownerToken, { 'x-tenant-context': randomUUID() }),
    });
    assert.ok([403, 404].includes(guarded.status), 'wrong tenant denied');

    const funnelRes = await fetch(`${base}/api/v1/management/entry-funnel/tool-funnel?days=7`, {
      headers: headers(ownerToken),
    });
    assert.equal(funnelRes.status, 200);
    const funnel = (await funnelRes.json()).data;
    assert.ok(Array.isArray(funnel.stages) && funnel.stages.length === 4, '4 stages');
    const stagesById = Object.fromEntries(funnel.stages.map((s) => [s.id, s]));
    assert.ok(stagesById.consult.value >= 1, 'consult events present');
    assert.ok(stagesById.customer.value >= 2, 'customers created in window');
    assert.ok(stagesById.task.value >= 1, 'customers with task');
    assert.ok(stagesById.done.value >= 1, 'customers with completed task');
    assert.ok(stagesById.done.rate >= 0, 'done rate present');
    assert.match(funnel.disclaimer, /不含支付、成交金额或第三方订单结果/);

    const heatRes = await fetch(`${base}/api/v1/management/entry-funnel/module-heat?days=7`, {
      headers: headers(ownerToken),
    });
    assert.equal(heatRes.status, 200);
    const heat = (await heatRes.json()).data;
    assert.ok(heat.max >= 1, 'max heat present');
    assert.ok(
      heat.modules.some((m) => m.moduleKey === 'offer_compare'),
      'offer_compare heat row',
    );
    assert.ok(
      heat.modules.some((m) => m.moduleKey === 'member_entry'),
      'member_entry heat row',
    );
    const offer = heat.modules.find((m) => m.moduleKey === 'offer_compare');
    assert.ok(offer.total >= 2, 'offer_compare count >= 2');
    assert.match(heat.disclaimer, /不含支付与成交/);
  } finally {
    await client.end();
  }
});
