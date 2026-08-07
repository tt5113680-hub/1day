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
const base = 'http://127.0.0.1:3160';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3160',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'hardening-002',
  },
  stdio: 'ignore',
});

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const headers = (token, key) => ({
  authorization: `Bearer ${token}`,
  'content-type': 'application/json',
  'x-request-id': randomUUID(),
  ...(key ? { 'idempotency-key': key } : {}),
});
const request = (path, options) => fetch(`${base}/api/v1${path}`, options);

async function ready() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      if ((await request('/health')).ok) return;
    } catch {
      // API is starting.
    }
    await wait(100);
  }
  throw Error('API did not start');
}

async function login(email, password, tenantId) {
  const response = await request('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, tenantId }),
  });
  const payload = await response.json();
  assert.equal(response.status, 201, JSON.stringify(payload));
  return payload.accessToken;
}

test.after(() => api.kill());

test('consumer action, employee task, evidence and management dashboard retain one operational trail', async () => {
  await ready();
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const stamp = Date.now();
    const token = await login('admin@system.local', 'ChangeMe123!', systemTenantId);
    const action = await request('/external-actions', {
      method: 'POST',
      headers: headers(token, `h002-action-${stamp}`),
      body: JSON.stringify({
        code: `h002-consult-${stamp}`,
        name: `H002 Consultation ${stamp}`,
        actionType: 'link',
        targetUrl: 'https://example.com/h002-consult',
        platform: 'web',
      }),
    });
    assert.equal(action.status, 201);
    const actionData = (await action.json()).data;
    const actionDetail = await request(`/consumer/actions/${actionData.id}?tenant=system`);
    assert.equal(actionDetail.status, 200);
    assert.equal((await actionDetail.json()).data.action.id, actionData.id);
    const confirmed = await request(`/consumer/actions/${actionData.id}/confirm?tenant=system`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': `h002-confirm-${stamp}` },
      body: JSON.stringify({ source: 'scene:h002', returnTo: '/c/entry?tenant=system' }),
    });
    assert.equal(confirmed.status, 201);
    assert.equal((await confirmed.json()).data.destination, 'https://example.com/h002-consult');
    const customer = await request('/customers', {
      method: 'POST',
      headers: headers(token, `h002-customer-${stamp}`),
      body: JSON.stringify({
        displayName: `H002 Consumer ${stamp}`,
        identities: [{ type: 'phone', value: `136${String(stamp).slice(-8)}` }],
      }),
    });
    assert.equal(customer.status, 201);
    const customerData = (await customer.json()).data;
    const source = await request(`/customers/${customerData.id}/sources`, {
      method: 'POST',
      headers: headers(token, `h002-source-${stamp}`),
      body: JSON.stringify({
        customerVersion: customerData.version,
        sourceRole: 'first_source',
        sourceType: 'scene_code',
        sourceId: `scene:h002:${stamp}`,
      }),
    });
    assert.equal(source.status, 201);
    const employeeId = (
      await client.query(
        "select id from employees where tenant_id=$1 and status='active' and deleted_at is null limit 1",
        [systemTenantId],
      )
    ).rows[0].id;
    const task = await request('/tasks', {
      method: 'POST',
      headers: headers(token, `h002-task-${stamp}`),
      body: JSON.stringify({
        customerId: customerData.id,
        assigneeEmployeeId: employeeId,
        title: 'H002 consumer action follow-up',
        reason: 'Confirmed scene action',
        dueAt: '2030-01-01T00:00:00.000Z',
        remindAt: '2029-12-31T00:00:00.000Z',
      }),
    });
    assert.equal(task.status, 201);
    const taskData = (await task.json()).data;
    const completed = await request(`/tasks/by-id/${taskData.id}/complete`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ version: taskData.version }),
    });
    assert.equal(completed.status, 201);
    const order = await request(`/customers/${customerData.id}/orders`, {
      method: 'POST',
      headers: headers(token, `h002-order-${stamp}`),
      body: JSON.stringify({
        orderNumber: `H002-${stamp}`,
        occurredAt: '2026-08-08T00:00:00.000Z',
      }),
    });
    assert.equal(order.status, 201);
    const orderData = (await order.json()).data;
    const evidence = await request(`/orders/${orderData.id}/evidence-files`, {
      method: 'POST',
      headers: headers(token, `h002-evidence-${stamp}`),
      body: JSON.stringify({
        evidenceType: 'screenshot',
        originalFilename: 'h002-proof.png',
        mediaType: 'image/png',
        contentBase64:
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl4qQAAAABJRU5ErkJggg==',
      }),
    });
    assert.equal(evidence.status, 201);
    const dashboard = await request('/management/dashboard', { headers: headers(token) });
    assert.equal(dashboard.status, 200);
    const trail = await client.query(
      'select (select count(*)::int from consumer_action_redirect_events where tenant_id=$1 and action_id=$2) redirects,(select count(*)::int from customer_sources where tenant_id=$1 and customer_id=$3 and source_id=$4) sources,(select count(*)::int from evidence_files where tenant_id=$1 and order_id=$5) evidence',
      [systemTenantId, actionData.id, customerData.id, `scene:h002:${stamp}`, orderData.id],
    );
    assert.deepEqual(trail.rows[0], { redirects: 1, sources: 1, evidence: 1 });
  } finally {
    await client.end();
  }
});

test('fixed demo lead is assigned, followed up, converted and placed into repurchase operations', async () => {
  await ready();
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const stamp = Date.now();
    const managerToken = await login('admin@system.local', 'ChangeMe123!', systemTenantId);
    const userId = randomUUID();
    const membershipId = randomUUID();
    const employeeId = randomUUID();
    const employeeEmail = `h002-advisor-${stamp}@example.test`;
    const roleId = (
      await client.query(
        "select mr.role_id from memberships m join membership_roles mr on mr.membership_id=m.id and mr.tenant_id=m.tenant_id join users u on u.id=m.user_id where m.tenant_id=$1 and u.email='admin@system.local' limit 1",
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
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,'H002 Advisor',password_hash,'active',null,null from users where email='admin@system.local'",
      [userId, employeeEmail],
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
      [employeeId, systemTenantId, membershipId, organizationId, `H002-${stamp}`],
    );
    const advisorToken = await login(employeeEmail, 'ChangeMe123!', systemTenantId);
    const customer = await request('/customers', {
      method: 'POST',
      headers: headers(managerToken, `h002-lead-customer-${stamp}`),
      body: JSON.stringify({
        displayName: `H002 New Lead ${stamp}`,
        identities: [{ type: 'phone', value: `135${String(stamp).slice(-8)}` }],
      }),
    });
    assert.equal(customer.status, 201);
    const customerData = (await customer.json()).data;
    const leadId = randomUUID();
    await client.query(
      "insert into employee_lead_pool_entries(id,tenant_id,customer_id,source_type,priority,status,created_by,updated_by) values($1,$2,$3,'scene_code','high','available',null,null)",
      [leadId, systemTenantId, customerData.id],
    );
    const leadList = await request('/employee/leads?status=available', {
      headers: headers(advisorToken),
    });
    assert.equal(leadList.status, 200);
    assert.ok((await leadList.json()).data.some((item) => item.id === leadId));
    const claimed = await request(`/employee/leads/${leadId}/claim`, {
      method: 'POST',
      headers: headers(advisorToken, `h002-claim-${stamp}`),
      body: JSON.stringify({ version: 1 }),
    });
    assert.equal(claimed.status, 201);
    const claimedData = (await claimed.json()).data;
    const converted = await request(`/employee/leads/${leadId}/convert`, {
      method: 'POST',
      headers: headers(advisorToken, `h002-convert-${stamp}`),
      body: JSON.stringify({
        version: claimedData.version,
        destination: 'follow_up',
        taskTitle: 'H002 qualify lead',
        dueAt: '2030-01-01T00:00:00.000Z',
      }),
    });
    assert.equal(converted.status, 201);
    const followUpTaskId = (await converted.json()).data.taskId;
    const followUp = await request(`/employee/tasks/${followUpTaskId}/follow-ups`, {
      method: 'POST',
      headers: headers(advisorToken, `h002-follow-up-${stamp}`),
      body: JSON.stringify({
        actionType: 'call',
        rawNote: 'Qualified demand and scheduled next contact.',
        nextTaskTitle: 'H002 repurchase check-in',
        nextTaskDueAt: '2030-01-02T00:00:00.000Z',
      }),
    });
    assert.equal(followUp.status, 201);
    assert.ok((await followUp.json()).data.next_task_id);
    for (const orderNumber of [`H002-A-${stamp}`, `H002-B-${stamp}`]) {
      const order = await request(`/customers/${customerData.id}/orders`, {
        method: 'POST',
        headers: headers(managerToken, `h002-order-${orderNumber}`),
        body: JSON.stringify({ orderNumber, occurredAt: '2026-08-08T00:00:00.000Z' }),
      });
      assert.equal(order.status, 201);
    }
    const profileId = randomUUID();
    await client.query(
      "insert into employee_nurture_profiles(id,tenant_id,customer_id,employee_id,segment,next_touch_at,created_by,updated_by) values($1,$2,$3,$4,'active','2030-01-03T00:00:00.000Z',null,null)",
      [profileId, systemTenantId, customerData.id, employeeId],
    );
    const repurchase = await request(`/employee/nurture/${customerData.id}`, {
      method: 'PATCH',
      headers: headers(advisorToken, `h002-repurchase-${stamp}`),
      body: JSON.stringify({
        version: 1,
        segment: 'repurchase',
        nextTouchAt: '2030-01-03T00:00:00.000Z',
      }),
    });
    assert.equal(repurchase.status, 200);
    const result = await client.query(
      "select p.segment,(select count(*)::int from customer_orders where tenant_id=$1 and customer_id=$2 and status='active' and deleted_at is null) orders from employee_nurture_profiles p where p.id=$3",
      [systemTenantId, customerData.id, profileId],
    );
    assert.deepEqual(result.rows[0], { segment: 'repurchase', orders: 2 });
  } finally {
    await client.end();
  }
});

test('fixed business-circle merchant is approved, visible to operators and retained in channel attribution', async () => {
  await ready();
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const stamp = Date.now();
    const token = await login('admin@system.local', 'ChangeMe123!', systemTenantId);
    const merchantTenantId = (
      await client.query(
        "select id from tenants where id<>$1 and status='active' and deleted_at is null order by created_at limit 1",
        [systemTenantId],
      )
    ).rows[0].id;
    const circleId = randomUUID();
    await client.query(
      "insert into platform_business_circles(id,tenant_id,code,name,description,created_by,updated_by) values($1,$2,$3,'H002 Fixed Circle','H002 fixed commercial demo circle',null,null)",
      [circleId, systemTenantId, `h002-circle-${stamp}`],
    );
    const invited = await request('/circle/merchants/invitations', {
      method: 'POST',
      headers: headers(token, `h002-circle-invite-${stamp}`),
      body: JSON.stringify({
        circleId,
        merchantTenantId,
        benefits: ['H002 member benefit'],
        invitationNote: 'H002 commercial demonstration',
        displayConfig: { visible: true, sortOrder: 1, headline: 'H002 featured merchant' },
      }),
    });
    const invitedBody = await invited.json();
    assert.equal(invited.status, 201, JSON.stringify(invitedBody));
    const membership = invitedBody.data;
    const reviewed = await request(`/circle/merchants/${membership.id}/circle-approve`, {
      method: 'POST',
      headers: headers(token, `h002-circle-review-${stamp}`),
      body: JSON.stringify({ version: membership.version, decision: 'approve' }),
    });
    assert.equal(reviewed.status, 201);
    const platformApproved = await request(`/circle/merchants/${membership.id}/platform-approve`, {
      method: 'POST',
      headers: headers(token, `h002-circle-platform-${stamp}`),
      body: JSON.stringify({ version: (await reviewed.json()).data.version, decision: 'approve' }),
    });
    assert.equal(platformApproved.status, 201);
    const dashboard = await request('/circle/dashboard', { headers: headers(token) });
    assert.equal(dashboard.status, 200);
    const circle = (await dashboard.json()).data.circles.find((item) => item.id === circleId);
    assert.ok(circle);
    assert.ok(circle.merchants.some((merchant) => merchant.merchantTenantId === merchantTenantId));
    const customer = await request('/customers', {
      method: 'POST',
      headers: headers(token, `h002-circle-customer-${stamp}`),
      body: JSON.stringify({
        displayName: `H002 Circle Customer ${stamp}`,
        identities: [{ type: 'phone', value: `134${String(stamp).slice(-8)}` }],
      }),
    });
    assert.equal(customer.status, 201);
    const customerData = (await customer.json()).data;
    const source = await request(`/customers/${customerData.id}/sources`, {
      method: 'POST',
      headers: headers(token, `h002-circle-source-${stamp}`),
      body: JSON.stringify({
        customerVersion: customerData.version,
        sourceRole: 'first_source',
        sourceType: 'business_circle',
        sourceId: circleId,
        metadata: { merchantTenantId, channel: 'fixed_circle' },
      }),
    });
    assert.equal(source.status, 201);
    const attribution = await request(`/customers/${customerData.id}/attribution`, {
      headers: headers(token),
    });
    assert.equal(attribution.status, 200);
    const first = (await attribution.json()).data.sources[0];
    assert.equal(first.source_type, 'business_circle');
    assert.equal(first.source_id, circleId);
  } finally {
    await client.end();
  }
});

test('merchant onboarding gives the tenant administrator the minimum rights to create staff and configure roles', async () => {
  await ready();
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const stamp = Date.now();
    const channelId = randomUUID();
    await client.query(
      "insert into platform_channels(id,tenant_id,code,name,onboarding_status,service_status,created_by,updated_by) values($1,$2,$3,'H002 merchant launch','open','ready',null,null)",
      [channelId, systemTenantId, `h002-launch-${stamp}`],
    );
    const platformToken = await login('admin@system.local', 'ChangeMe123!', systemTenantId);
    const ownerEmail = `h002-owner-${stamp}@example.test`;
    const ownerPassword = `H002-owner-${stamp}-Password!`;
    const onboarding = await request('/channel/merchant-onboardings', {
      method: 'POST',
      headers: headers(platformToken, `h002-onboarding-${stamp}`),
      body: JSON.stringify({
        channelId,
        slug: `h002-merchant-${stamp}`,
        tenantName: `H002 Merchant ${stamp}`,
        organizationName: 'H002 HQ',
        storeName: 'H002 Main Store',
        adminName: 'H002 Owner',
        adminEmail: ownerEmail,
        adminPassword: ownerPassword,
        template: 'starter',
        plan: 'growth',
      }),
    });
    assert.equal(onboarding.status, 201);
    const tenant = (await onboarding.json()).data;
    const ownerToken = await login(ownerEmail, ownerPassword, tenant.tenantId);
    const organizationId = (
      await client.query('select id from organizations where tenant_id=$1 and code=$2', [
        tenant.tenantId,
        'HQ',
      ])
    ).rows[0].id;
    const invite = await request('/employees/invitations', {
      method: 'POST',
      headers: headers(ownerToken, `h002-invite-${stamp}`),
      body: JSON.stringify({
        email: `h002-advisor-${stamp}@example.test`,
        organizationId,
        employeeCode: `H002-${stamp}`,
        title: 'Advisor',
      }),
    });
    assert.equal(invite.status, 201);
    const role = await request('/rbac/roles', {
      method: 'POST',
      headers: headers(ownerToken, `h002-role-${stamp}`),
      body: JSON.stringify({ code: `advisor-${stamp}`, name: 'H002 Advisor' }),
    });
    assert.equal(role.status, 201);
    const configured = await request(`/rbac/roles/${(await role.json()).data.id}/permissions`, {
      method: 'POST',
      headers: headers(ownerToken),
      body: JSON.stringify({
        version: 1,
        permissionCodes: ['customer.read', 'task.read'],
        reason: 'H002 launch role setup',
        confirmation: 'CONFIRM_PERMISSION_CHANGE',
      }),
    });
    assert.equal(configured.status, 201);
    const permissions = await client.query(
      "select p.code from role_permissions rp join permissions p on p.id=rp.permission_id where rp.tenant_id=$1 and rp.role_id=(select mr.role_id from memberships m join membership_roles mr on mr.membership_id=m.id where m.tenant_id=$1 and m.user_id=(select id from users where email=$2) limit 1) and rp.status='active' order by p.code",
      [tenant.tenantId, ownerEmail],
    );
    assert.deepEqual(
      permissions.rows.map((row) => row.code),
      ['employee.manage', 'tenant.manage'],
    );
  } finally {
    await client.end();
  }
});
