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
const tenant = '00000000-0000-4000-8000-000000000001';
const base = 'http://127.0.0.1:3165';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3165',
    DATABASE_URL: db,
    AUTH_TOKEN_SECRET: 'g1-winf121-audit-export',
  },
  stdio: 'ignore',
});
const headers = (token, extra = {}) => ({
  authorization: `Bearer ${token}`,
  'content-type': 'application/json',
  'x-request-id': randomUUID(),
  ...extra,
});
const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');
const page = () => read('apps/management-web/app/m/permission-audit/page.tsx');
const css = () => read('apps/management-web/app/m/permission-audit/page.module.css');
const service = () => read('apps/api/src/management-permission-audit.service.ts');
const controller = () => read('apps/api/src/management-permission-audit.controller.ts');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test.after(() => api.kill());

test('G1-W∞-121: audit export API surface present + tenant gated + CSV shaped', () => {
  const c = controller();
  assert.match(c, /@Get\('export'\)/);
  assert.match(c, /async export/);
  assert.match(c, /exportAudit/);
  assert.match(c, /tenant\.manage/);
  assert.match(c, /FastifyReply/);
  assert.match(c, /text\/csv; charset=utf-8/);
  assert.match(c, /content-disposition/);
  const s = service();
  assert.match(s, /async exportAudit/);
  assert.match(s, /queryAuditRows/);
  assert.match(s, /audit_logs/);
  assert.match(s, /const csv = \[/);
  assert.match(s, /replaceAll\('"', '""'\)/);
  assert.match(s, /join\('\\n'\)/);
  assert.match(s, /filename: `permission-audit-/);
  assert.match(s, /management\.audit\.exported/);
  assert.match(s, /outbox_events/);
  assert.doesNotMatch(s, /Math\.random|mockMetrics/);
});

test('G1-W∞-121: audit export UI button + success bar + CSS present', () => {
  const p = page();
  const m = css();
  assert.match(p, /导出审计/);
  assert.match(p, /permission-audit\/export/);
  assert.match(p, /blob\(\)/);
  assert.match(p, /createObjectURL/);
  assert.match(p, /audit-export-message/);
  assert.match(p, /topBarActions/);
  assert.match(m, /\.topBarActions\s*\{/);
  assert.match(m, /\.exportBar\s*\{/);
  assert.match(m, /topBarRefresh:disabled/);
});

test('G1-W∞-121: real DB export round-trip with audit/outbox write + cross-tenant denial', async () => {
  await ready();
  const client = new Client({ connectionString: db });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const organization = randomUUID();
  const owner = { user: randomUUID(), membership: randomUUID(), employee: randomUUID() };
  const exportCorrelation = randomUUID();
  try {
    await client.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,$4,'team','active',null,null)",
      [organization, tenant, `w121-${stamp}`, 'W121 audit org'],
    );
    await client.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
      [owner.user, `W121OWN-${stamp}@example.test`, 'W121 owner'],
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
      [owner.employee, tenant, owner.membership, organization, `W121-${stamp}`],
    );
    // an auditable privileged change row so the CSV has real content in the change/risk filters
    await client.query(
      `insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,created_by,updated_by)
       values($1,$2,$3,'rbac.role_permissions_updated','role',$4,$5,'w121-trace',jsonb_build_object('after', jsonb_build_array('tenant.manage')),$3,$3)`,
      [randomUUID(), tenant, owner.user, randomUUID(), exportCorrelation],
    );

    const token = await login(`W121OWN-${stamp}@example.test`);

    // unauthorized export denied
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/permission-audit/export?filter=all`, {
          headers: { 'x-request-id': randomUUID() },
        })
      ).status,
      401,
    );

    // cross-tenant context export denied (403, no leak)
    const guarded = await fetch(`${base}/api/v1/management/permission-audit/export?filter=all`, {
      headers: headers(token, { 'x-tenant-context': randomUUID() }),
    });
    assert.ok([403, 404].includes(guarded.status), 'wrong tenant denied (403/404)');

    // valid export returns real CSV of tenant's audit records
    const resp = await fetch(`${base}/api/v1/management/permission-audit/export?filter=all`, {
      headers: headers(token),
    });
    assert.equal(resp.status, 200, `export failed: ${await resp.clone().text()}`);
    const csv = await resp.text();
    assert.match(
      csv,
      /^action,kind,actor,resource_type,resource_id,correlation_id,trace_id,detail,created_at/,
    );
    assert.ok(
      csv.includes('rbac.role_permissions_updated'),
      'CSV contains the seeded audit action',
    );
    assert.ok(csv.includes('w121-trace'), 'CSV contains trace id');

    // export write itself is audited + dispatched (audit export 全覆盖)
    const audit = (
      await client.query(
        "select count(*)::int c from audit_logs where action='management.audit.exported'",
      )
    ).rows[0].c;
    assert.ok(audit >= 1, 'export write recorded in audit_logs');
    const evt = (
      await client.query(
        "select count(*)::int c from outbox_events where event_type='management.audit.exported.v1' and aggregate_type='audit_export'",
      )
    ).rows[0].c;
    assert.ok(evt >= 1, 'export write dispatched to outbox');

    // invalid filter rejected
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/permission-audit/export?filter=bogus`, {
          headers: headers(token),
        })
      ).status,
      400,
    );
  } finally {
    await client.end();
  }
});

async function ready() {
  for (let i = 0; i < 40; i += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      /* starting */
    }
    await wait(100);
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
