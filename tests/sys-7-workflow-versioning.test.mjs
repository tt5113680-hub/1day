/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const systemTenantId = '00000000-0000-4000-8000-000000000001';
const base = 'http://127.0.0.1:3283';
const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3283',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'sys-7-workflow-versioning',
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

async function login(email, password, tenantId = systemTenantId) {
  const response = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, tenantId }),
  });
  assert.equal(response.status, 201);
  return (await response.json()).accessToken;
}

const headers = (token, key) => ({
  authorization: `Bearer ${token}`,
  'content-type': 'application/json',
  'x-request-id': randomUUID(),
  ...(key ? { 'idempotency-key': key } : {}),
});

test.after(() => api.kill());

test('SYS-7: clone published version, edit conditions, publish v2, start on v2 + denials', async () => {
  await ready();
  const token = await login('admin@system.local', 'ChangeMe123!');
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  let employeeId;
  try {
    const organizationId = (
      await client.query(
        'select organization_id from employees where tenant_id=$1 and organization_id is not null limit 1',
        [systemTenantId],
      )
    ).rows[0]?.organization_id;
    assert.ok(organizationId);
    employeeId = randomUUID();
    const userId = randomUUID();
    const membershipId = randomUUID();
    await client.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
      [userId, `wf-ver-${stamp}@example.local`, 'WF Ver'],
    );
    await client.query(
      "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [membershipId, systemTenantId, userId],
    );
    await client.query(
      "insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,'00000000-0000-4000-8000-000000000004')",
      [randomUUID(), systemTenantId, membershipId],
    );
    await client.query(
      "insert into employees(id,tenant_id,membership_id,organization_id,employee_code,status,started_at,created_by,updated_by) values($1,$2,$3,$4,$5,'active',now(),null,null)",
      [employeeId, systemTenantId, membershipId, organizationId, `wfv-${stamp}`],
    );
  } finally {
    await client.end();
  }

  const steps = [
    {
      name: 'Contact',
      type: 'task',
      assigneeEmployeeId: employeeId,
      timeoutMinutes: 60,
    },
    {
      name: 'Upsell',
      type: 'task',
      assigneeEmployeeId: employeeId,
      timeoutMinutes: 60,
      condition: { key: 'upsell', equals: true },
    },
  ];

  const created = await fetch(`${base}/api/v1/workflows`, {
    method: 'POST',
    headers: headers(token, randomUUID()),
    body: JSON.stringify({ code: `wf_ver_${stamp}`, name: `Versioning ${stamp}`, steps }),
  });
  assert.equal(created.status, 201);
  const definition = (await created.json()).data;

  const published = await fetch(`${base}/api/v1/workflows/${definition.id}/publish`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({
      versionId: definition.draftVersionId,
      definitionVersion: definition.version,
    }),
  });
  assert.equal(published.status, 201);
  const publishedData = (await published.json()).data;

  const v1Detail = await fetch(
    `${base}/api/v1/workflows/${definition.id}/versions/${definition.draftVersionId}`,
    { headers: headers(token) },
  );
  assert.equal(v1Detail.status, 200);
  const v1 = (await v1Detail.json()).data;
  assert.equal(v1.version.status, 'published');
  assert.equal(v1.steps.length, 2);
  assert.deepEqual(v1.steps[1].condition, { key: 'upsell', equals: true });

  const cloned = await fetch(`${base}/api/v1/workflows/${definition.id}/versions`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({
      definitionVersion: publishedData.version,
      sourceVersionId: definition.draftVersionId,
      steps: [
        steps[0],
        {
          ...steps[1],
          name: 'Upsell v2',
          condition: { key: 'upsell', equals: false },
        },
      ],
    }),
  });
  assert.equal(cloned.status, 201);
  const v2 = (await cloned.json()).data;
  assert.equal(v2.sequence, 2);

  const v2Detail = await fetch(`${base}/api/v1/workflows/${definition.id}/versions/${v2.id}`, {
    headers: headers(token),
  });
  assert.equal(v2Detail.status, 200);
  const v2Body = (await v2Detail.json()).data;
  assert.equal(v2Body.steps[1].name, 'Upsell v2');
  assert.deepEqual(v2Body.steps[1].condition, { key: 'upsell', equals: false });

  assert.equal(
    (
      await fetch(`${base}/api/v1/workflows/${definition.id}/publish`, {
        method: 'POST',
        headers: headers(token),
        body: JSON.stringify({
          versionId: v2.id,
          definitionVersion: publishedData.version,
        }),
      })
    ).status,
    409,
  );

  const publishV2 = await fetch(`${base}/api/v1/workflows/${definition.id}/publish`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({
      versionId: v2.id,
      definitionVersion: v2.definitionVersion,
    }),
  });
  assert.equal(publishV2.status, 201);
  const publishV2Data = (await publishV2.json()).data;

  assert.equal(
    (
      await fetch(`${base}/api/v1/workflows/${definition.id}/publish`, {
        method: 'POST',
        headers: headers(token),
        body: JSON.stringify({
          versionId: v2.id,
          definitionVersion: publishV2Data.version,
        }),
      })
    ).status,
    404,
  );

  const start = await fetch(`${base}/api/v1/workflows/${definition.id}/instances`, {
    method: 'POST',
    headers: headers(token, randomUUID()),
    body: JSON.stringify({ context: { upsell: true } }),
  });
  assert.equal(start.status, 201);
  const started = (await start.json()).data;
  const instance = await fetch(`${base}/api/v1/workflows/instances/${started.id}`, {
    headers: headers(token),
  });
  assert.equal(instance.status, 200);
  const instanceData = (await instance.json()).data;
  assert.equal(instanceData.instance.workflow_version_id, v2.id);
  assert.equal(instanceData.steps.filter((step) => step.status === 'active').length, 1);
  assert.equal(instanceData.steps.find((step) => step.status === 'active').name, 'Contact');
  assert.ok(instanceData.steps.some((step) => step.name === 'Upsell v2' && step.status === 'skipped'));

  assert.equal(
    (
      await fetch(`${base}/api/v1/workflows/${definition.id}/versions`, {
        method: 'POST',
        headers: headers(token),
        body: JSON.stringify({
          definitionVersion: 1,
          sourceVersionId: definition.draftVersionId,
        }),
      })
    ).status,
    409,
  );

  assert.equal(
    (
      await fetch(`${base}/api/v1/workflows/${definition.id}/versions`, {
        method: 'POST',
        headers: headers(token),
        body: JSON.stringify({
          definitionVersion: publishV2Data.version,
          steps: [
            {
              name: 'Bad',
              type: 'task',
              assigneeEmployeeId: employeeId,
              timeoutMinutes: 1,
              condition: { key: 'x' },
            },
          ],
        }),
      })
    ).status,
    400,
  );
});
