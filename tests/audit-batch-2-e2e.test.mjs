/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const systemTenantId = '00000000-0000-4000-8000-000000000001';
const base = 'http://127.0.0.1:3163';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3163',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'audit-batch-2',
  },
  stdio: 'ignore',
});

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const request = (path, options) => fetch(`${base}/api/v1${path}`, options);
const headers = (token, key) => ({
  authorization: `Bearer ${token}`,
  'content-type': 'application/json',
  'x-tenant-context': systemTenantId,
  'x-request-id': randomUUID(),
  ...(key ? { 'idempotency-key': key } : {}),
});

async function ready() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      if ((await request('/health')).ok) return;
    } catch {
      // API is starting.
    }
    await wait(100);
  }
  throw Error('API did not start');
}

async function login(email, password, tenantId = systemTenantId) {
  const response = await request('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, tenantId }),
  });
  const payload = await response.json();
  assert.equal(response.status, 201, JSON.stringify(payload));
  return payload.accessToken;
}

async function createAdvisor(client, stamp) {
  const userId = randomUUID();
  const membershipId = randomUUID();
  const employeeId = randomUUID();
  const email = `audit-batch-2-advisor-${stamp}@example.test`;
  const roleId = (
    await client.query(
      `select mr.role_id from memberships m
       join membership_roles mr on mr.membership_id=m.id and mr.tenant_id=m.tenant_id
       join users u on u.id=m.user_id
       where m.tenant_id=$1 and u.email='admin@system.local' limit 1`,
      [systemTenantId],
    )
  ).rows[0].role_id;
  const organizationId = (
    await client.query(
      "select id from organizations where tenant_id=$1 and status='active' and deleted_at is null limit 1",
      [systemTenantId],
    )
  ).rows[0].id;
  await client.query(
    "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,'Audit Batch 2 Advisor',password_hash,'active',null,null from users where email='admin@system.local'",
    [userId, email],
  );
  await client.query(
    "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
    [membershipId, systemTenantId, userId],
  );
  await client.query(
    'insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,$4)',
    [randomUUID(), systemTenantId, membershipId, roleId],
  );
  await client.query(
    "insert into employees(id,tenant_id,membership_id,organization_id,employee_code,title,status,created_by,updated_by) values($1,$2,$3,$4,$5,'Advisor','active',null,null)",
    [employeeId, systemTenantId, membershipId, organizationId, `AUDIT-B2-${stamp}`],
  );
  return { employeeId, email };
}

test.after(() => api.kill());

test('public consumer action atomically creates one assigned operating trail and an employee closes it', async () => {
  await ready();
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const stamp = Date.now();
    const adminToken = await login('admin@system.local', 'ChangeMe123!');
    const advisor = await createAdvisor(client, stamp);
    const advisorToken = await login(advisor.email, 'ChangeMe123!');
    const shareCode = `auditB2${stamp}`;
    await client.query(
      `insert into employee_share_codes(id,tenant_id,employee_id,code,scenario,target_path,created_by,updated_by)
       values($1,$2,$3,$4,'campaign','/c/entry',null,null)`,
      [randomUUID(), systemTenantId, advisor.employeeId, shareCode],
    );
    const action = await request('/external-actions', {
      method: 'POST',
      headers: headers(adminToken, `audit-b2-action-${stamp}`),
      body: JSON.stringify({
        code: `audit-b2-consult-${stamp}`,
        name: `Audit Batch 2 consultation ${stamp}`,
        actionType: 'link',
        targetUrl: 'https://example.com/audit-b2-consult',
        platform: 'web',
      }),
    });
    assert.equal(action.status, 201);
    const actionId = (await action.json()).data.id;

    const shareOpened = await request(`/public/share-codes/${shareCode}/open`, { method: 'POST' });
    assert.equal(shareOpened.status, 201);
    const consumerKey = `audit-b2-consumer-${stamp}`;
    const consumerRequest = () =>
      request(`/consumer/actions/${actionId}/confirm?tenant=system`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': consumerKey },
        body: JSON.stringify({
          source: 'scene:audit_batch_2',
          returnTo: '/c/entry?tenant=system',
          shareCode,
        }),
      });
    const [first, concurrent] = await Promise.all([consumerRequest(), consumerRequest()]);
    assert.equal(first.status, 201);
    assert.equal(concurrent.status, 201);
    const firstData = (await first.json()).data;
    const concurrentData = (await concurrent.json()).data;
    assert.equal(firstData.eventId, concurrentData.eventId);
    assert.equal(firstData.operating.customerId, concurrentData.operating.customerId);
    assert.equal(firstData.operating.assignmentBasis, 'employee_share');
    assert.ok(firstData.operating.taskId);
    assert.equal(firstData.operating.leadPoolEntryId, null);

    const replay = await consumerRequest();
    assert.equal(replay.status, 201);
    const replayData = (await replay.json()).data;
    assert.equal(replayData.replayed, true);
    assert.deepEqual(replayData.operating, firstData.operating);

    const projection = await client.query(
      `select p.assignment_basis,p.customer_id,p.customer_source_id,p.task_id,
              (select count(*)::int from audit_logs where tenant_id=p.tenant_id and action='consumer.operating_projection_created' and resource_id=p.id) audits,
              (select count(*)::int from outbox_events where tenant_id=p.tenant_id and event_type='consumer.operating.projected.v1' and aggregate_id=p.id) outbox,
              (select count(*)::int from task_reminders where tenant_id=p.tenant_id and task_id=p.task_id and status='pending') reminders
       from consumer_operating_projections p
       where p.tenant_id=$1 and p.consumer_event_id=$2`,
      [systemTenantId, firstData.eventId],
    );
    assert.equal(projection.rowCount, 1);
    assert.deepEqual(
      {
        assignment_basis: projection.rows[0].assignment_basis,
        audits: projection.rows[0].audits,
        outbox: projection.rows[0].outbox,
        reminders: projection.rows[0].reminders,
      },
      { assignment_basis: 'employee_share', audits: 1, outbox: 1, reminders: 1 },
    );
    const source = await client.query(
      'select source_type,metadata from customer_sources where id=$1 and tenant_id=$2',
      [firstData.operating.customerSourceId, systemTenantId],
    );
    assert.equal(source.rows[0].source_type, 'employee_share');
    assert.equal(source.rows[0].metadata.scene, 'scene:audit_batch_2');
    const owner = await client.query(
      'select employee_id from customer_ownerships where id=$1 and tenant_id=$2 and status=$3',
      [firstData.operating.ownershipId, systemTenantId, 'active'],
    );
    assert.equal(owner.rows[0].employee_id, advisor.employeeId);

    const workbench = await request('/employee/workbench', { headers: headers(advisorToken) });
    assert.equal(workbench.status, 200);
    const employeeTask = (await workbench.json()).data.customerReminders.find(
      (item) => item.id === firstData.operating.taskId,
    );
    assert.ok(employeeTask, 'automatic task is visible to the assigned employee');
    const followUp = await request(`/employee/tasks/${employeeTask.id}/follow-ups`, {
      method: 'POST',
      headers: headers(advisorToken, `audit-b2-follow-up-${stamp}`),
      body: JSON.stringify({
        actionType: 'message',
        rawNote: 'Consumer asked for a store consultation; follow-up is scheduled.',
        nextTaskTitle: 'Confirm public consultation outcome',
        nextTaskDueAt: '2030-01-01T00:00:00.000Z',
      }),
    });
    assert.equal(followUp.status, 201);
    assert.ok((await followUp.json()).data.next_task_id);
    const completed = await request(`/employee/workbench/tasks/${employeeTask.id}/complete`, {
      method: 'POST',
      headers: headers(advisorToken),
      body: JSON.stringify({ version: employeeTask.version }),
    });
    assert.equal(completed.status, 201);

    const order = await request(`/customers/${firstData.operating.customerId}/orders`, {
      method: 'POST',
      headers: headers(advisorToken, `audit-b2-order-${stamp}`),
      body: JSON.stringify({
        orderNumber: `AUDIT-B2-${stamp}`,
        occurredAt: '2026-08-08T00:00:00.000Z',
      }),
    });
    assert.equal(order.status, 201);
    const orderId = (await order.json()).data.id;
    const evidence = await request(`/orders/${orderId}/evidence-files`, {
      method: 'POST',
      headers: headers(advisorToken, `audit-b2-evidence-${stamp}`),
      body: JSON.stringify({
        evidenceType: 'screenshot',
        originalFilename: 'audit-b2-result.png',
        mediaType: 'image/png',
        contentBase64:
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl4qQAAAABJRU5ErkJggg==',
      }),
    });
    assert.equal(evidence.status, 201);

    const dashboard = await request('/management/dashboard', { headers: headers(adminToken) });
    assert.equal(dashboard.status, 200);
    const managementCustomer = await request(
      `/management/customers/${firstData.operating.customerId}`,
      {
        headers: headers(adminToken),
      },
    );
    assert.equal(managementCustomer.status, 200);
    const managementData = (await managementCustomer.json()).data;
    assert.equal(managementData.customer.id, firstData.operating.customerId);
    assert.ok(managementData.sources.some((item) => item.source_type === 'employee_share'));
    assert.ok(managementData.ownerships.some((item) => item.status === 'active'));
    assert.ok(managementData.tasks.some((item) => item.status === 'completed'));
    assert.ok(managementData.orders.some((item) => item.evidence_count === 1));
    const result = await client.query(
      `select (select count(*)::int from task_follow_ups where tenant_id=$1 and task_id=$2) follow_ups,
              (select count(*)::int from evidence_files where tenant_id=$1 and order_id=$3) evidence,
              (select status from tasks where tenant_id=$1 and id=$2) task_status`,
      [systemTenantId, employeeTask.id, orderId],
    );
    assert.deepEqual(result.rows[0], { follow_ups: 1, evidence: 1, task_status: 'completed' });

    const otherTenant = (
      await client.query(
        "select slug from tenants where id<>$1 and status='active' and deleted_at is null order by created_at limit 1",
        [systemTenantId],
      )
    ).rows[0];
    assert.ok(otherTenant, 'the test database contains the required isolation tenant');
    const crossTenant = await request(
      `/consumer/actions/${actionId}/confirm?tenant=${otherTenant.slug}`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': `audit-b2-cross-${stamp}`,
        },
        body: JSON.stringify({ source: 'scene:cross_tenant' }),
      },
    );
    assert.equal(crossTenant.status, 404);
    const lowPermission = await request('/management/dashboard', {
      headers: { 'x-request-id': randomUUID() },
    });
    assert.equal(lowPermission.status, 401);
  } finally {
    await client.end();
  }
});

test('public consumer action without a verified employee follows the existing lead-pool rule', async () => {
  await ready();
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const stamp = Date.now();
    const token = await login('admin@system.local', 'ChangeMe123!');
    const action = await request('/external-actions', {
      method: 'POST',
      headers: headers(token, `audit-b2-pool-action-${stamp}`),
      body: JSON.stringify({
        code: `audit-b2-pool-${stamp}`,
        name: `Audit Batch 2 pool ${stamp}`,
        actionType: 'link',
        targetUrl: 'https://example.com/audit-b2-pool',
        platform: 'web',
      }),
    });
    assert.equal(action.status, 201);
    const actionId = (await action.json()).data.id;
    const response = await request(`/consumer/actions/${actionId}/confirm?tenant=system`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': `audit-b2-pool-consumer-${stamp}`,
      },
      body: JSON.stringify({ source: 'scene:pool_fallback' }),
    });
    assert.equal(response.status, 201);
    const data = (await response.json()).data;
    assert.equal(data.operating.assignmentBasis, 'lead_pool');
    assert.equal(data.operating.taskId, null);
    assert.ok(data.operating.leadPoolEntryId);
    const lead = await client.query(
      `select l.status,l.assignee_employee_id,l.source_type
       from employee_lead_pool_entries l where l.id=$1 and l.tenant_id=$2`,
      [data.operating.leadPoolEntryId, systemTenantId],
    );
    assert.deepEqual(lead.rows[0], {
      status: 'available',
      assignee_employee_id: null,
      source_type: 'consumer_action',
    });
  } finally {
    await client.end();
  }
});
