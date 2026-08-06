/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const tenant = '00000000-0000-4000-8000-000000000001';
const base = 'http://127.0.0.1:3027';
const requireFromApi = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { Client } = requireFromApi('pg');
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3027', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'core-010-e2e' },
  stdio: 'ignore',
});
let client;
const headers = (token, key) => ({
  authorization: `Bearer ${token}`,
  'content-type': 'application/json',
  'x-request-id': randomUUID(),
  ...(key ? { 'idempotency-key': key } : {}),
});
const request = (path, options) => fetch(base + path, options);
async function ready() {
  for (let i = 0; i < 30; i += 1) {
    try {
      if ((await request('/api/v1/health')).ok) return;
    } catch {
      // API is starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw Error('API not ready');
}
async function login(email, password) {
  const response = await request('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, tenantId: tenant }),
  });
  assert.equal(response.status, 201);
  return (await response.json()).accessToken;
}
test.after(async () => {
  api.kill();
  await client?.end();
});
test('published workflows execute tasks, conditions, approvals and timeout safeguards', async () => {
  await ready();
  const token = await login('admin@system.local', 'ChangeMe123!');
  client = new Client({ connectionString: db });
  await client.connect();
  const stamp = Date.now();
  const organizationId = (
    await client.query(
      'select organization_id from employees where tenant_id=$1 and organization_id is not null limit 1',
      [tenant],
    )
  ).rows[0]?.organization_id;
  assert.ok(organizationId);
  const employeeId = randomUUID(),
    assigneeUserId = randomUUID(),
    assigneeMembershipId = randomUUID(),
    assigneeEmail = `workflow-assignee-${stamp}@test.local`;
  await client.query(
    "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',$1,$1 from users where email='admin@system.local'",
    [assigneeUserId, assigneeEmail, 'Workflow Assignee'],
  );
  await client.query(
    "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',$3,$3)",
    [assigneeMembershipId, tenant, assigneeUserId],
  );
  await client.query(
    "insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,'00000000-0000-4000-8000-000000000004')",
    [randomUUID(), tenant, assigneeMembershipId],
  );
  await client.query(
    "insert into employees(id,tenant_id,membership_id,organization_id,employee_code,status,started_at,created_by,updated_by) values($1,$2,$3,$4,$5,'active',now(),$1,$1)",
    [employeeId, tenant, assigneeMembershipId, organizationId, `wf-${stamp}`],
  );
  const assigneeToken = await login(assigneeEmail, 'ChangeMe123!');
  const steps = [
    { name: 'Contact customer', type: 'task', assigneeEmployeeId: employeeId, timeoutMinutes: 60 },
    {
      name: 'Manager approval',
      type: 'approval',
      assigneeEmployeeId: employeeId,
      timeoutMinutes: 60,
    },
    {
      name: 'Optional upsell',
      type: 'task',
      assigneeEmployeeId: employeeId,
      timeoutMinutes: 60,
      condition: { key: 'upsell', equals: true },
    },
  ];
  const create = await request('/api/v1/workflows', {
    method: 'POST',
    headers: headers(token, `workflow-${stamp}`),
    body: JSON.stringify({ code: `follow-up-${stamp}`, name: 'Follow up workflow', steps }),
  });
  assert.equal(create.status, 201);
  const definition = (await create.json()).data;
  const duplicate = await request('/api/v1/workflows', {
    method: 'POST',
    headers: headers(token, `workflow-${stamp}`),
    body: JSON.stringify({ code: `different-${stamp}`, name: 'Ignored duplicate', steps }),
  });
  assert.equal((await duplicate.json()).data.id, definition.id);
  const publish = await request(`/api/v1/workflows/${definition.id}/publish`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({
      versionId: definition.draftVersionId,
      definitionVersion: definition.version,
    }),
  });
  assert.equal(publish.status, 201);
  const published = (await publish.json()).data;
  const version = await request(`/api/v1/workflows/${definition.id}/versions`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ definitionVersion: published.version, steps }),
  });
  assert.equal(version.status, 201);
  assert.equal((await version.json()).data.sequence, 2);
  const start = await request(`/api/v1/workflows/${definition.id}/instances`, {
    method: 'POST',
    headers: headers(token, `instance-${stamp}`),
    body: JSON.stringify({ context: { upsell: false } }),
  });
  assert.equal(start.status, 201);
  let current = (await start.json()).data;
  const initial = await request(`/api/v1/workflows/instances/${current.id}`, {
    headers: headers(token),
  });
  let detail = (await initial.json()).data;
  assert.equal(detail.steps[0].status, 'active');
  assert.ok(detail.steps[0].task_id);
  const complete = await request(
    `/api/v1/workflows/instances/${current.id}/steps/${detail.steps[0].id}/complete`,
    {
      method: 'POST',
      headers: headers(assigneeToken),
      body: JSON.stringify({ instanceVersion: current.version }),
    },
  );
  assert.equal(complete.status, 201);
  current = (await complete.json()).data;
  detail = (
    await (
      await request(`/api/v1/workflows/instances/${current.id}`, { headers: headers(token) })
    ).json()
  ).data;
  assert.equal(detail.steps[1].status, 'active');
  const approve = await request(
    `/api/v1/workflows/instances/${current.id}/steps/${detail.steps[1].id}/approve`,
    {
      method: 'POST',
      headers: headers(assigneeToken),
      body: JSON.stringify({ instanceVersion: current.version }),
    },
  );
  assert.equal(approve.status, 201);
  current = (await approve.json()).data;
  assert.equal(current.status, 'completed');
  const invalid = await request('/api/v1/workflows', {
    method: 'POST',
    headers: headers(token, `invalid-${stamp}`),
    body: JSON.stringify({ code: `invalid-${stamp}`, name: 'Invalid', steps: [] }),
  });
  assert.equal(invalid.status, 400);
  const timeoutDefinition = await request('/api/v1/workflows', {
    method: 'POST',
    headers: headers(token, `timeout-definition-${stamp}`),
    body: JSON.stringify({ code: `timeout-${stamp}`, name: 'Timeout workflow', steps: [steps[0]] }),
  });
  const timeoutWorkflow = (await timeoutDefinition.json()).data;
  const timeoutPublish = await request(`/api/v1/workflows/${timeoutWorkflow.id}/publish`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({
      versionId: timeoutWorkflow.draftVersionId,
      definitionVersion: timeoutWorkflow.version,
    }),
  });
  assert.equal(timeoutPublish.status, 201);
  const timeoutStart = await request(`/api/v1/workflows/${timeoutWorkflow.id}/instances`, {
    method: 'POST',
    headers: headers(token, `timeout-instance-${stamp}`),
    body: JSON.stringify({ context: {} }),
  });
  const timeoutInstance = (await timeoutStart.json()).data;
  await client.query(
    "update workflow_instance_steps set due_at=now()-interval '1 minute' where workflow_instance_id=$1",
    [timeoutInstance.id],
  );
  const process = await request('/api/v1/workflows/actions/process-timeouts', {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({}),
  });
  assert.equal((await process.json()).data.timedOut, 1);
  const timedOut = await request(`/api/v1/workflows/instances/${timeoutInstance.id}`, {
    headers: headers(token),
  });
  assert.equal((await timedOut.json()).data.instance.status, 'timed_out');
  const audit = await client.query(
    "select count(*)::int as count from audit_logs where tenant_id=$1 and action='workflow.step_timed_out' and resource_id=$2",
    [tenant, timeoutInstance.id],
  );
  const outbox = await client.query(
    "select count(*)::int as count from outbox_events where tenant_id=$1 and event_type='workflow.instance.timed_out.v1' and aggregate_id=$2",
    [tenant, timeoutInstance.id],
  );
  assert.equal(audit.rows[0].count, 1);
  assert.equal(outbox.rows[0].count, 1);
  const userId = randomUUID(),
    membershipId = randomUUID(),
    email = `no-workflow-${stamp}@test.local`;
  await client.query(
    "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',$1,$1 from users where email='admin@system.local'",
    [userId, email, 'No Workflow Permission'],
  );
  await client.query(
    "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',$3,$3)",
    [membershipId, tenant, userId],
  );
  assert.equal((await request('/api/v1/workflows')).status, 401);
  assert.equal(
    (
      await request('/api/v1/workflows', {
        headers: { ...headers(token), 'x-tenant-context': '00000000-0000-4000-8000-000000000099' },
      })
    ).status,
    403,
  );
  const noPermissionToken = await login(email, 'ChangeMe123!');
  assert.equal(
    (await request('/api/v1/workflows', { headers: headers(noPermissionToken) })).status,
    403,
  );
});
