/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const base = 'http://127.0.0.1:3274';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3274',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'sys-4-workflow-authoring',
  },
  stdio: 'ignore',
});

async function ready() {
  for (let i = 0; i < 60; i += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      // starting
    }
    await wait(100);
  }
  throw new Error('API not ready');
}

async function login(email, password, tenantId) {
  const response = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, tenantId }),
  });
  assert.equal(response.status, 201);
  return (await response.json()).accessToken;
}

test.after(() => api.kill());

test('SYS-4: Management workflow authoring create+publish reuses existing workflow APIs', async () => {
  await ready();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const tenantId = randomUUID();
  const ownerId = randomUUID();
  const ownerRoleId = randomUUID();
  const ownerMembershipId = randomUUID();
  const orgId = randomUUID();
  const employeeId = randomUUID();
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(
      "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [tenantId, `sys4-wf-${stamp}`, `SYS4 WF ${stamp}`],
    );
    await client.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
      [ownerId, `owner-wf-${stamp}@example.local`, 'Owner'],
    );
    await client.query(
      "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [ownerMembershipId, tenantId, ownerId],
    );
    await client.query(
      "insert into roles(id,tenant_id,code,name,status,created_by,updated_by) values($1,$2,$3,'Owner','active',null,null)",
      [ownerRoleId, tenantId, `owner_${stamp}`],
    );
    await client.query(
      'insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,$4)',
      [randomUUID(), tenantId, ownerMembershipId, ownerRoleId],
    );
    const tenantManage = (
      await client.query("select id from permissions where code='tenant.manage' limit 1")
    ).rows[0].id;
    const workflowManage = (
      await client.query("select id from permissions where code='workflow.manage' limit 1")
    ).rows[0].id;
    await client.query(
      "insert into role_permissions(id,tenant_id,role_id,permission_id,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null),($5,$2,$3,$6,'active',null,null)",
      [randomUUID(), tenantId, ownerRoleId, tenantManage, randomUUID(), workflowManage],
    );
    await client.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,$4,'merchant','active',null,null)",
      [orgId, tenantId, `ORG-${stamp}`, `Org ${stamp}`],
    );
    await client.query(
      "insert into employees(id,tenant_id,membership_id,organization_id,employee_code,title,status,created_by,updated_by) values($1,$2,$3,$4,$5,'Owner Emp','active',null,null)",
      [employeeId, tenantId, ownerMembershipId, orgId, `EM-${stamp}`],
    );
  } finally {
    await client.end();
  }

  const token = await login(`owner-wf-${stamp}@example.local`, 'ChangeMe123!', tenantId);
  const headers = {
    authorization: `Bearer ${token}`,
    'x-tenant-context': tenantId,
    'x-request-id': randomUUID(),
    'content-type': 'application/json',
  };
  const code = `author-${stamp}`;
  const create = await fetch(`${base}/api/v1/workflows`, {
    method: 'POST',
    headers: { ...headers, 'idempotency-key': randomUUID() },
    body: JSON.stringify({
      code,
      name: `Author ${stamp}`,
      steps: [
        {
          name: 'Manager approval',
          type: 'approval',
          assigneeEmployeeId: employeeId,
          timeoutMinutes: 60,
        },
      ],
    }),
  });
  assert.equal(create.status, 201);
  const definition = (await create.json()).data;
  assert.ok(definition.draftVersionId);

  const publish = await fetch(`${base}/api/v1/workflows/${definition.id}/publish`, {
    method: 'POST',
    headers: { ...headers, 'x-request-id': randomUUID() },
    body: JSON.stringify({
      versionId: definition.draftVersionId,
      definitionVersion: definition.version,
    }),
  });
  assert.equal(publish.status, 201);

  const overview = await fetch(`${base}/api/v1/management/workflows`, {
    headers: { ...headers, 'x-request-id': randomUUID() },
  });
  assert.equal(overview.status, 200);
  const templates = (await overview.json()).data.templates;
  const authored = templates.find((item) => item.code === code);
  assert.ok(authored);
  assert.ok(authored.published_version_id);
});
