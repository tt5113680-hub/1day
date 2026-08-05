/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID, scryptSync } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const requireFromApi = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { Client } = requireFromApi('pg');
const base = 'http://127.0.0.1:3020';
const tenantId = '00000000-0000-4000-8000-000000000001';
const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3020',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'core-005-e2e-secret',
  },
  stdio: 'ignore',
});
const request = (path, options) => fetch(base + path, options);
const headers = (token, key) => ({
  authorization: `Bearer ${token}`,
  'content-type': 'application/json',
  'x-request-id': randomUUID(),
  ...(key ? { 'idempotency-key': key } : {}),
});

async function ready() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      if ((await request('/api/v1/health')).ok) return;
    } catch {
      // API is starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('API did not become ready');
}

async function login(email = 'admin@system.local', password = 'ChangeMe123!') {
  const response = await request('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, tenantId }),
  });
  assert.equal(response.status, 201);
  return (await response.json()).accessToken;
}

test.after(() => api.kill());

test('attribution records sources and contributions, then transfers ownership only after approval', async () => {
  await ready();
  const token = await login();
  const stamp = Date.now().toString();
  const organization = await request('/api/v1/organizations', {
    method: 'POST',
    headers: headers(token, `attribution-org-${stamp}`),
    body: JSON.stringify({
      code: `attribution-${stamp}`,
      name: 'Attribution Org',
      organizationType: 'team',
    }),
  });
  assert.equal(organization.status, 201);
  const organizationId = (await organization.json()).data.id;
  const invite = await request('/api/v1/employees/invitations', {
    method: 'POST',
    headers: headers(token, `attribution-invite-${stamp}`),
    body: JSON.stringify({
      email: `attribution-${stamp}@example.test`,
      organizationId,
      employeeCode: `A-${stamp}`,
      title: 'Advisor',
    }),
  });
  assert.equal(invite.status, 201);
  const invitation = (await invite.json()).data;
  const accepted = await request(`/api/v1/employees/invitations/${invitation.id}/accept`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({
      invitationToken: invitation.invitationToken,
      displayName: 'Attribution Member',
    }),
  });
  assert.equal(accepted.status, 201);
  const employee = (await accepted.json()).data;
  const customer = await request('/api/v1/customers', {
    method: 'POST',
    headers: headers(token, `attribution-customer-${stamp}`),
    body: JSON.stringify({
      displayName: 'Attribution Customer',
      identities: [{ type: 'phone', value: `137${stamp.slice(-8).padStart(8, '0')}` }],
    }),
  });
  assert.equal(customer.status, 201);
  const customerData = (await customer.json()).data;

  const firstSourceBody = {
    customerVersion: customerData.version,
    sourceRole: 'first_source',
    sourceType: 'scene_code',
    sourceId: `scene-${stamp}`,
    metadata: { channel: 'offline' },
  };
  const firstSource = await request(`/api/v1/customers/${customerData.id}/sources`, {
    method: 'POST',
    headers: headers(token, `first-source-${stamp}`),
    body: JSON.stringify(firstSourceBody),
  });
  assert.equal(firstSource.status, 201);
  const source = (await firstSource.json()).data;
  const replay = await request(`/api/v1/customers/${customerData.id}/sources`, {
    method: 'POST',
    headers: headers(token, `first-source-${stamp}`),
    body: JSON.stringify(firstSourceBody),
  });
  assert.equal((await replay.json()).data.id, source.id);
  const currentSource = await request(`/api/v1/customers/${customerData.id}/sources`, {
    method: 'POST',
    headers: headers(token, `current-source-${stamp}`),
    body: JSON.stringify({
      customerVersion: customerData.version + 1,
      sourceRole: 'current_source',
      sourceType: 'employee_share',
      sourceId: employee.id,
    }),
  });
  assert.equal(currentSource.status, 201);
  const contribution = await request(`/api/v1/customers/${customerData.id}/contributions`, {
    method: 'POST',
    headers: headers(token, `contribution-${stamp}`),
    body: JSON.stringify({
      customerVersion: customerData.version + 2,
      employeeId: employee.id,
      contributionRole: 'referrer',
      evidenceRefs: [`order-${stamp}`],
      confirmed: true,
    }),
  });
  assert.equal(contribution.status, 201);
  const transfer = await request(`/api/v1/customers/${customerData.id}/ownership-transfers`, {
    method: 'POST',
    headers: headers(token, `transfer-${stamp}`),
    body: JSON.stringify({
      customerVersion: customerData.version + 3,
      toEmployeeId: employee.id,
      reason: 'Qualified referral handover',
    }),
  });
  assert.equal(transfer.status, 201);
  const transferData = (await transfer.json()).data;
  const approved = await request(`/api/v1/ownership-transfers/${transferData.id}/approve`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ version: transferData.version, decision: 'approve' }),
  });
  assert.equal(approved.status, 201);
  const overview = await request(`/api/v1/customers/${customerData.id}/attribution`, {
    headers: headers(token),
  });
  assert.equal(overview.status, 200);
  const data = (await overview.json()).data;
  assert.equal(data.sources.length, 2);
  assert.equal(data.contributions[0].contribution_role, 'referrer');
  assert.equal(data.ownerships.find((item) => item.status === 'active').employee_id, employee.id);
  assert.equal(data.transfers[0].status, 'approved');

  const stale = await request(`/api/v1/customers/${customerData.id}/contributions`, {
    method: 'POST',
    headers: headers(token, `stale-${stamp}`),
    body: JSON.stringify({
      customerVersion: customerData.version + 3,
      employeeId: employee.id,
      contributionRole: 'receiver',
      evidenceRefs: ['stale'],
    }),
  });
  assert.equal(stale.status, 409);

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const password = 'NoRole123!';
    const hash = `scrypt$no-role-${stamp}$${scryptSync(password, `no-role-${stamp}`, 64).toString('base64url')}`;
    await client.query('update users set password_hash=$1 where email=$2', [
      hash,
      `attribution-${stamp}@example.test`,
    ]);
    const audit = await client.query(
      "select action from audit_logs where tenant_id=$1 and resource_id=$2 and action='customer.ownership_transfer_approved'",
      [tenantId, customerData.id],
    );
    const event = await client.query(
      "select event_type,correlation_id,trace_id from outbox_events where tenant_id=$1 and aggregate_id=$2 and event_type='customer.ownership.assigned.v1'",
      [tenantId, customerData.id],
    );
    assert.equal(audit.rowCount, 1);
    assert.equal(event.rowCount, 1);
    assert.ok(event.rows[0].correlation_id);
    assert.ok(event.rows[0].trace_id);
    const unprivileged = await login(`attribution-${stamp}@example.test`, password);
    assert.equal(
      (
        await request(`/api/v1/customers/${customerData.id}/attribution`, {
          headers: headers(unprivileged),
        })
      ).status,
      403,
    );
  } finally {
    await client.end();
  }
  assert.equal(
    (
      await request(`/api/v1/customers/${customerData.id}/attribution`, {
        headers: { 'x-request-id': randomUUID() },
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await request(`/api/v1/customers/${customerData.id}/sources`, {
        method: 'POST',
        headers: headers(token, `invalid-${stamp}`),
        body: JSON.stringify({ customerVersion: 5, sourceRole: 'invalid', sourceType: '' }),
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request(`/api/v1/customers/${customerData.id}/attribution`, {
        headers: { ...headers(token), 'x-tenant-context': '00000000-0000-4000-8000-000000000099' },
      })
    ).status,
    403,
  );
});
