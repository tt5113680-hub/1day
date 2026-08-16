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
const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const tenant = '00000000-0000-4000-8000-000000000001';
const base = 'http://127.0.0.1:3077';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3077',
    DATABASE_URL: db,
    AUTH_TOKEN_SECRET: 'g1-winf134-reviews-insights',
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

test('G1-W134: controller/service/page expose source filter + insights trend', () => {
  const c = read('apps/api/src/management-commerce.controller.ts');
  const s = read('apps/api/src/management-commerce.service.ts');
  const p = read('apps/management-web/app/m/reviews/page.tsx');
  const css = read('apps/management-web/app/m/_commerce.module.css');
  assert.match(c, /@Get\('reviews\/insights'\)/);
  assert.match(c, /@Query\('source'\)/);
  assert.match(c, /reviewInsights/);
  assert.match(s, /async reviewInsights/);
  assert.match(s, /import_meituan/);
  assert.match(s, /ratingTrend/);
  assert.match(s, /bySource/);
  assert.match(s, /不接美团\/点评\/抖音实时评价流/);
  assert.match(p, /reviews\/insights/);
  assert.match(p, /多平台标签/);
  assert.match(p, /评分趋势/);
  assert.match(p, /sourceTag/);
  assert.match(p, /knownSources/);
  assert.match(css, /\.sourceTag/);
  assert.match(css, /\.trendList/);
});

test('G1-W134: insights bySource + ratingTrend + source filter with real DB', async () => {
  await ready();
  const client = new Client({ connectionString: db });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const organization = randomUUID();
  const owner = { user: randomUUID(), membership: randomUUID(), employee: randomUUID() };
  const merchant = randomUUID();
  const store = randomUUID();
  const reviewLocal = randomUUID();
  const reviewMt = randomUUID();
  try {
    await client.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,$4,'team','active',null,null)",
      [organization, tenant, `rv134-org-${stamp}`, `Reviews134 org ${stamp}`],
    );
    await client.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
      [owner.user, `RV134-${stamp}@example.test`, 'Reviews134 owner'],
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
      [owner.employee, tenant, owner.membership, organization, `RVE134-${stamp}`],
    );
    await client.query(
      "insert into merchants(id,tenant_id,organization_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,$5,'active',null,null)",
      [merchant, tenant, organization, `rv134-m-${stamp}`, `Reviews134 merchant ${stamp}`],
    );
    await client.query(
      "insert into stores(id,tenant_id,organization_id,merchant_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,$5,$6,'active',null,null)",
      [store, tenant, organization, merchant, `rv134-s-${stamp}`, `Reviews134 store ${stamp}`],
    );
    await client.query(
      `insert into store_reviews(id,tenant_id,store_id,rating,content,reviewer_label,source,status,created_by,updated_by)
       values($1,$2,$3,5,'local review','客A','local','active',null,null),
             ($4,$2,$3,4,'mt import','客B','import_meituan','active',null,null)`,
      [reviewLocal, tenant, store, reviewMt],
    );

    const token = await login(`RV134-${stamp}@example.test`);
    const insightsResp = await fetch(`${base}/api/v1/management/commerce/reviews/insights?days=30`, {
      headers: headers(token),
    });
    assert.equal(insightsResp.status, 200);
    const insights = (await insightsResp.json()).data;
    assert.equal(insights.days, 30);
    assert.ok(Array.isArray(insights.bySource));
    assert.ok(insights.bySource.some((row) => row.source === 'local' && row.total >= 1));
    assert.ok(insights.bySource.some((row) => row.source === 'import_meituan' && row.total >= 1));
    assert.ok(Array.isArray(insights.ratingTrend));
    assert.ok(insights.ratingTrend.length >= 1);
    assert.match(insights.disclaimer, /不接美团/);

    const filtered = await fetch(
      `${base}/api/v1/management/commerce/reviews?reply=all&source=import_meituan`,
      { headers: headers(token) },
    );
    assert.equal(filtered.status, 200);
    const rows = (await filtered.json()).data;
    assert.ok(rows.every((row) => row.source === 'import_meituan'));
    assert.ok(rows.some((row) => row.id === reviewMt));
    assert.ok(rows.every((row) => row.id !== reviewLocal));
    assert.ok(rows[0].sourceLabel);

    const bad = await fetch(`${base}/api/v1/management/commerce/reviews/insights?days=11`, {
      headers: headers(token),
    });
    assert.equal(bad.status, 400);
  } finally {
    await client.query('delete from store_reviews where id=any($1::uuid[])', [
      [reviewLocal, reviewMt],
    ]).catch(() => undefined);
    await client.query('delete from auth_sessions where user_id=$1', [owner.user]).catch(() => undefined);
    await client.query('delete from stores where id=$1', [store]).catch(() => undefined);
    await client.query('delete from merchants where id=$1', [merchant]).catch(() => undefined);
    await client.query('delete from employees where id=$1', [owner.employee]).catch(() => undefined);
    await client.query('delete from membership_roles where membership_id=$1', [owner.membership]).catch(() => undefined);
    await client.query('delete from memberships where id=$1', [owner.membership]).catch(() => undefined);
    await client.query('delete from users where id=$1', [owner.user]).catch(() => undefined);
    await client.query('delete from organizations where id=$1', [organization]).catch(() => undefined);
    await client.end();
  }
});
