/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const base = 'http://127.0.0.1:3136';
const systemTenant = '00000000-0000-4000-8000-000000000001';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3136', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'page-p-006-api' },
  stdio: 'ignore',
});
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
async function ready() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      // API is starting.
    }
    await wait(100);
  }
  throw Error('API did not start');
}
async function login(email, tenantId) {
  const response = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'ChangeMe123!', tenantId }),
  });
  assert.equal(response.status, 201);
  return (await response.json()).accessToken;
}
test.after(() => api.kill());

test('platform templates persist fixed modules, industry configuration and guarded publication', async () => {
  await ready();
  const client = new Client({ connectionString: db });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const tenantId = randomUUID();
  const userId = randomUUID();
  const membershipId = randomUUID();
  const roleId = randomUUID();
  const email = `template-user-${stamp}@local.test`;
  await client.query(
    "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,'Template tenant','active',null,null)",
    [tenantId, `template-tenant-${stamp}`],
  );
  const passwordHash = (
    await client.query("select password_hash from users where email='admin@system.local'")
  ).rows[0].password_hash;
  await client.query(
    "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) values($1,$2,'Template user',$3,'active',null,null)",
    [userId, email, passwordHash],
  );
  await client.query(
    "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
    [membershipId, tenantId, userId],
  );
  await client.query(
    "insert into roles(id,tenant_id,code,name,status,created_by,updated_by) values($1,$2,'template_manager','Template manager','active',null,null)",
    [roleId, tenantId],
  );
  await client.query(
    'insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,$4)',
    [randomUUID(), tenantId, membershipId, roleId],
  );
  await client.query(
    "insert into role_permissions(id,tenant_id,role_id,permission_id,status,created_by,updated_by) values($1,$2,$3,'00000000-0000-4000-8000-000000000102','active',null,null)",
    [randomUUID(), tenantId, roleId],
  );
  try {
    const systemToken = await login('admin@system.local', systemTenant);
    const tenantToken = await login(email, tenantId);
    assert.equal(
      (
        await fetch(`${base}/api/v1/platform/templates`, {
          headers: { 'x-request-id': randomUUID() },
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/platform/templates`, {
          headers: { authorization: `Bearer ${tenantToken}`, 'x-request-id': randomUUID() },
        })
      ).status,
      403,
    );
    const headers = {
      authorization: `Bearer ${systemToken}`,
      'x-request-id': randomUUID(),
      'idempotency-key': randomUUID(),
      'content-type': 'application/json',
    };
    const body = {
      code: `clinic-${stamp}`,
      name: 'Clinic consultation',
      target: 'consumer',
      industryConfig: { industry: 'clinic', scenario: 'consultation' },
      modules: [
        { moduleType: 'hero', config: {} },
        { moduleType: 'action_grid', config: {} },
        { moduleType: 'content', config: {} },
      ],
    };
    assert.equal(
      (
        await fetch(`${base}/api/v1/platform/templates`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ ...body, industryConfig: [] }),
        })
      ).status,
      400,
    );
    const created = await fetch(`${base}/api/v1/platform/templates`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    assert.equal(created.status, 201);
    const template = (await created.json()).data;
    const replay = await fetch(`${base}/api/v1/platform/templates`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    assert.equal((await replay.json()).data.id, template.id);
    const listed = await fetch(`${base}/api/v1/platform/templates`, {
      headers: { authorization: `Bearer ${systemToken}`, 'x-request-id': randomUUID() },
    });
    const listedTemplate = (await listed.json()).data.find((row) => row.id === template.id);
    assert.deepEqual(listedTemplate.industry_config, body.industryConfig);
    const preview = await fetch(`${base}/api/v1/platform/templates/${template.id}/preview`, {
      headers: { authorization: `Bearer ${systemToken}`, 'x-request-id': randomUUID() },
    });
    const previewData = (await preview.json()).data;
    assert.equal(previewData.modules.length, 3);
    assert.deepEqual(previewData.template.industryConfig, body.industryConfig);
    const published = await fetch(`${base}/api/v1/platform/templates/${template.id}/publish`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${systemToken}`,
        'x-request-id': randomUUID(),
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        versionId: template.draftVersionId,
        templateVersion: template.version,
      }),
    });
    assert.equal(published.status, 201);
    assert.equal(
      (
        await fetch(`${base}/api/v1/platform/templates/${template.id}/publish`, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${systemToken}`,
            'x-request-id': randomUUID(),
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            versionId: template.draftVersionId,
            templateVersion: template.version,
          }),
        })
      ).status,
      409,
    );
    const counts = await client.query(
      "select (select count(*) from page_templates where id=$1 and tenant_id=$2)::int as templates,(select count(*) from page_modules where template_version_id=$3 and tenant_id=$2)::int as modules,(select count(*) from audit_logs where tenant_id=$2 and resource_id=$1 and action='page.template_created')::int as created_audits,(select count(*) from outbox_events where tenant_id=$2 and aggregate_id=$1 and event_type='page.template.published.v1')::int as published_outbox",
      [template.id, systemTenant, template.draftVersionId],
    );
    assert.deepEqual(counts.rows[0], {
      templates: 1,
      modules: 3,
      created_audits: 1,
      published_outbox: 1,
    });
  } finally {
    await client.end();
  }
});
