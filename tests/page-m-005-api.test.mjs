/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';
const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test',
  tenant = '00000000-0000-4000-8000-000000000001',
  base = 'http://127.0.0.1:3093';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3093', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'page-m-005-api' },
  stdio: 'ignore',
});
const headers = (token, extra = {}) => ({
  authorization: `Bearer ${token}`,
  'x-request-id': randomUUID(),
  ...extra,
});
async function ready() {
  for (let i = 0; i < 30; i += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      // Production API is still starting.
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error('API did not start');
}
async function login() {
  const r = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@system.local',
      password: 'ChangeMe123!',
      tenantId: tenant,
    }),
  });
  assert.equal(r.status, 201);
  return (await r.json()).accessToken;
}
test.after(() => api.kill());
test('workflow center exposes tenant-scoped templates, instances, approvals and timeout exceptions', async () => {
  await ready();
  const client = new Client({ connectionString: db });
  await client.connect();
  const definition = randomUUID(),
    version = randomUUID(),
    instance = randomUUID(),
    step = randomUUID(),
    workflowStep = randomUUID();
  try {
    const employee = (
      await client.query(
        "select id from employees where tenant_id=$1 and status='active' and deleted_at is null limit 1",
        [tenant],
      )
    ).rows[0];
    assert.ok(employee);
    await client.query(
      "insert into workflow_definitions(id,tenant_id,code,name,published_version_id,created_by,updated_by) values($1,$2,$3,'Management workflow',$4,null,null)",
      [definition, tenant, `management-${definition.slice(0, 8)}`, version],
    );
    await client.query(
      'insert into workflow_versions(id,tenant_id,definition_id,sequence,created_by,updated_by) values($1,$2,$3,1,null,null)',
      [version, tenant, definition],
    );
    await client.query(
      "insert into workflow_steps(id,tenant_id,workflow_version_id,position,name,step_type,assignee_employee_id,timeout_minutes,created_by,updated_by) values($1,$2,$3,1,'Manager approval','approval',$4,60,null,null)",
      [workflowStep, tenant, version, employee.id],
    );
    await client.query(
      "insert into workflow_instances(id,tenant_id,definition_id,workflow_version_id,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null)",
      [instance, tenant, definition, version],
    );
    await client.query(
      "insert into workflow_instance_steps(id,tenant_id,workflow_instance_id,workflow_step_id,position,name,step_type,assignee_employee_id,due_at,status,created_by,updated_by) values($1,$2,$3,$4,1,'Manager approval','approval',$5,now()+interval '1 hour','active',null,null)",
      [step, tenant, instance, workflowStep, employee.id],
    );
    const token = await login();
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/workflows`, {
          headers: { 'x-request-id': randomUUID() },
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/workflows`, {
          headers: headers(token, { 'x-tenant-context': randomUUID() }),
        })
      ).status,
      403,
    );
    assert.equal(
      (await fetch(`${base}/api/v1/management/workflows?status=bad`, { headers: headers(token) }))
        .status,
      400,
    );
    const response = await fetch(`${base}/api/v1/management/workflows?status=active`, {
      headers: headers(token),
    });
    assert.equal(response.status, 200);
    const data = (await response.json()).data;
    assert.equal(
      data.templates.some((item) => item.id === definition),
      true,
    );
    assert.equal(
      data.instances.some((item) => item.id === instance && item.assignee_name),
      true,
    );
    assert.equal(
      data.approvals.some((item) => item.id === step),
      true,
    );
  } finally {
    await client.end();
  }
});
