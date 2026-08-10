/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const base = 'http://127.0.0.1:3273';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3273',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'sys-6-workflow-org-write',
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

test('SYS-6: workflow/org overview opens beyond tenant.manage; org+workflow writes reuse APIs', async () => {
  await ready();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const tenantId = randomUUID();
  const ownerId = randomUUID();
  const readerId = randomUUID();
  const ownerRoleId = randomUUID();
  const readerRoleId = randomUUID();
  const ownerMembershipId = randomUUID();
  const readerMembershipId = randomUUID();
  const orgId = randomUUID();
  const merchantId = randomUUID();
  const employeeId = randomUUID();
  const definitionId = randomUUID();
  const versionId = randomUUID();
  const stepId = randomUUID();
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(
      "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [tenantId, `sys6-wo-${stamp}`, `SYS6 WO ${stamp}`],
    );
    for (const [id, email, name] of [
      [ownerId, `owner-wo-${stamp}@example.local`, 'Owner'],
      [readerId, `reader-wo-${stamp}@example.local`, 'Reader'],
    ]) {
      await client.query(
        "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
        [id, email, name],
      );
    }
    await client.query(
      "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null),($4,$2,$5,'active',null,null)",
      [ownerMembershipId, tenantId, ownerId, readerMembershipId, readerId],
    );
    await client.query(
      "insert into roles(id,tenant_id,code,name,status,created_by,updated_by) values($1,$2,$3,'Owner','active',null,null),($4,$2,$5,'Reader','active',null,null)",
      [ownerRoleId, tenantId, `owner_${stamp}`, readerRoleId, `reader_${stamp}`],
    );
    await client.query(
      'insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,$4),($5,$2,$6,$7)',
      [
        randomUUID(),
        tenantId,
        ownerMembershipId,
        ownerRoleId,
        randomUUID(),
        readerMembershipId,
        readerRoleId,
      ],
    );
    const tenantManage = (
      await client.query("select id from permissions where code='tenant.manage' limit 1")
    ).rows[0].id;
    const workflowRead = (
      await client.query("select id from permissions where code='workflow.read' limit 1")
    ).rows[0].id;
    const organizationRead = (
      await client.query("select id from permissions where code='organization.read' limit 1")
    ).rows[0].id;
    const workflowManage = (
      await client.query("select id from permissions where code='workflow.manage' limit 1")
    ).rows[0].id;
    const organizationManage = (
      await client.query("select id from permissions where code='organization.manage' limit 1")
    ).rows[0].id;
    await client.query(
      "insert into role_permissions(id,tenant_id,role_id,permission_id,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null),($5,$2,$3,$6,'active',null,null),($7,$2,$3,$8,'active',null,null)",
      [
        randomUUID(),
        tenantId,
        ownerRoleId,
        tenantManage,
        randomUUID(),
        workflowManage,
        randomUUID(),
        organizationManage,
      ],
    );
    await client.query(
      "insert into role_permissions(id,tenant_id,role_id,permission_id,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null),($5,$2,$3,$6,'active',null,null)",
      [
        randomUUID(),
        tenantId,
        readerRoleId,
        workflowRead,
        randomUUID(),
        organizationRead,
      ],
    );
    await client.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,$4,'merchant','active',null,null)",
      [orgId, tenantId, `ORG-${stamp}`, `Org ${stamp}`],
    );
    await client.query(
      "insert into merchants(id,tenant_id,organization_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,$5,'active',null,null)",
      [merchantId, tenantId, orgId, `M-${stamp}`, `Merchant ${stamp}`],
    );
    await client.query(
      "insert into employees(id,tenant_id,membership_id,organization_id,employee_code,title,status,created_by,updated_by) values($1,$2,$3,$4,$5,'Owner Emp','active',null,null)",
      [employeeId, tenantId, ownerMembershipId, orgId, `EM-${stamp}`],
    );
    await client.query(
      "insert into workflow_definitions(id,tenant_id,code,name,published_version_id,created_by,updated_by) values($1,$2,$3,$4,$5,null,null)",
      [definitionId, tenantId, `WF-${stamp}`, `WF ${stamp}`, versionId],
    );
    await client.query(
      'insert into workflow_versions(id,tenant_id,definition_id,sequence,created_by,updated_by) values($1,$2,$3,1,null,null)',
      [versionId, tenantId, definitionId],
    );
    await client.query(
      "update workflow_versions set status='published' where id=$1",
      [versionId],
    );
    await client.query(
      "insert into workflow_steps(id,tenant_id,workflow_version_id,position,name,step_type,assignee_employee_id,timeout_minutes,created_by,updated_by) values($1,$2,$3,1,'Approve','approval',$4,60,null,null)",
      [stepId, tenantId, versionId, employeeId],
    );
  } finally {
    await client.end();
  }

  const readerToken = await login(`reader-wo-${stamp}@example.local`, 'ChangeMe123!', tenantId);
  const ownerToken = await login(`owner-wo-${stamp}@example.local`, 'ChangeMe123!', tenantId);
  const readerHeaders = {
    authorization: `Bearer ${readerToken}`,
    'x-tenant-context': tenantId,
    'x-request-id': randomUUID(),
  };
  const ownerHeaders = {
    authorization: `Bearer ${ownerToken}`,
    'x-tenant-context': tenantId,
    'x-request-id': randomUUID(),
  };

  const workflowOverview = await fetch(`${base}/api/v1/management/workflows`, {
    headers: readerHeaders,
  });
  assert.equal(workflowOverview.status, 200);
  assert.equal((await workflowOverview.json()).data.templates.length, 1);

  const orgOverview = await fetch(`${base}/api/v1/management/organization-employees`, {
    headers: readerHeaders,
  });
  assert.equal(orgOverview.status, 200);
  const orgData = (await orgOverview.json()).data;
  assert.equal(orgData.organizations.length, 1);
  assert.equal(orgData.merchants.length, 1);

  const deniedOrgCreate = await fetch(`${base}/api/v1/organizations`, {
    method: 'POST',
    headers: {
      ...readerHeaders,
      'content-type': 'application/json',
      'idempotency-key': randomUUID(),
      'x-request-id': randomUUID(),
    },
    body: JSON.stringify({
      code: `DENY-${stamp}`,
      name: `Denied ${stamp}`,
      organizationType: 'team',
    }),
  });
  assert.equal(deniedOrgCreate.status, 403);

  const createdOrg = await fetch(`${base}/api/v1/organizations`, {
    method: 'POST',
    headers: {
      ...ownerHeaders,
      'content-type': 'application/json',
      'idempotency-key': randomUUID(),
      'x-request-id': randomUUID(),
    },
    body: JSON.stringify({
      code: `NEW-ORG-${stamp}`,
      name: `New Org ${stamp}`,
      organizationType: 'team',
    }),
  });
  assert.equal(createdOrg.status, 201);
  const newOrgId = (await createdOrg.json()).data.id;

  const createdMerchant = await fetch(`${base}/api/v1/merchants`, {
    method: 'POST',
    headers: {
      ...ownerHeaders,
      'content-type': 'application/json',
      'idempotency-key': randomUUID(),
      'x-request-id': randomUUID(),
    },
    body: JSON.stringify({
      code: `NEW-M-${stamp}`,
      name: `New Merchant ${stamp}`,
      organizationId: newOrgId,
    }),
  });
  assert.equal(createdMerchant.status, 201);
  const newMerchantId = (await createdMerchant.json()).data.id;

  const createdStore = await fetch(`${base}/api/v1/stores`, {
    method: 'POST',
    headers: {
      ...ownerHeaders,
      'content-type': 'application/json',
      'idempotency-key': randomUUID(),
      'x-request-id': randomUUID(),
    },
    body: JSON.stringify({
      code: `NEW-S-${stamp}`,
      name: `New Store ${stamp}`,
      organizationId: newOrgId,
      merchantId: newMerchantId,
      address: 'Test Ave 1',
    }),
  });
  assert.equal(createdStore.status, 201);

  const started = await fetch(`${base}/api/v1/workflows/${definitionId}/instances`, {
    method: 'POST',
    headers: {
      ...ownerHeaders,
      'content-type': 'application/json',
      'idempotency-key': randomUUID(),
      'x-request-id': randomUUID(),
    },
    body: JSON.stringify({ context: {} }),
  });
  assert.equal(started.status, 201);

  const afterStart = await fetch(`${base}/api/v1/management/workflows`, {
    headers: { ...ownerHeaders, 'x-request-id': randomUUID() },
  });
  assert.equal(afterStart.status, 200);
  const approvals = (await afterStart.json()).data.approvals;
  assert.ok(approvals.length >= 1);
  const approval = approvals[0];
  assert.ok(approval.workflow_instance_id);
  assert.ok(Number.isInteger(approval.instance_version));

  const approved = await fetch(
    `${base}/api/v1/workflows/instances/${approval.workflow_instance_id}/steps/${approval.id}/approve`,
    {
      method: 'POST',
      headers: {
        ...ownerHeaders,
        'content-type': 'application/json',
        'x-request-id': randomUUID(),
      },
      body: JSON.stringify({ instanceVersion: approval.instance_version }),
    },
  );
  assert.equal(approved.status, 201);
});
