/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

const apiBase = 'http://127.0.0.1:3317';
const tenant = '00000000-0000-4000-8000-000000000001';
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3317',
    DATABASE_URL: db,
    AUTH_TOKEN_SECRET: 'sys-24-customer-merge-transfer',
  },
  stdio: 'ignore',
});

const headers = (token, key) => ({
  authorization: `Bearer ${token}`,
  'content-type': 'application/json',
  'x-request-id': randomUUID(),
  ...(key ? { 'idempotency-key': key } : {}),
});

async function ready() {
  for (let i = 0; i < 40; i += 1) {
    try {
      if ((await fetch(`${apiBase}/api/v1/health`)).ok) return;
    } catch {
      /* waiting */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw Error('API did not start');
}

async function login() {
  const response = await fetch(`${apiBase}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@system.local',
      password: 'ChangeMe123!',
      tenantId: tenant,
    }),
  });
  assert.equal(response.status, 201);
  return (await response.json()).accessToken;
}

test.after(() => api.kill());

test('SYS-24 detail exposes version/mergedIntoId and supports transfer+approve+merge APIs', async () => {
  await ready();
  const token = await login();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const create = async (name) => {
    const response = await fetch(`${apiBase}/api/v1/customers`, {
      method: 'POST',
      headers: headers(token, `sys24-create-${name}-${stamp}`),
      body: JSON.stringify({
        displayName: name,
        identities: [{ type: 'wechat', value: `sys24_${name}_${stamp}` }],
      }),
    });
    const payload = await response.json();
    assert.equal(response.status, 201, JSON.stringify(payload));
    return payload.data;
  };

  const source = await create(`SYS24 Source ${stamp}`);
  const target = await create(`SYS24 Target ${stamp}`);

  const detail = await fetch(`${apiBase}/api/v1/management/customers/${source.id}`, {
    headers: headers(token),
  });
  assert.equal(detail.status, 200);
  const detailData = (await detail.json()).data;
  assert.equal(detailData.customer.version, source.version);
  assert.equal(detailData.customer.mergedIntoId, null);

  const organization = await fetch(`${apiBase}/api/v1/organizations`, {
    method: 'POST',
    headers: headers(token, `sys24-org-${stamp}`),
    body: JSON.stringify({
      code: `sys24-${stamp}`.slice(0, 32),
      name: `SYS24 Org ${stamp}`,
      organizationType: 'team',
    }),
  });
  const organizationPayload = await organization.json();
  assert.equal(organization.status, 201, JSON.stringify(organizationPayload));
  const organizationId = organizationPayload.data.id;
  const invite = await fetch(`${apiBase}/api/v1/employees/invitations`, {
    method: 'POST',
    headers: headers(token, `sys24-invite-${stamp}`),
    body: JSON.stringify({
      email: `sys24-${stamp}@example.test`,
      organizationId,
      employeeCode: `S24-${stamp}`.slice(0, 24),
      title: 'Advisor',
    }),
  });
  const invitePayload = await invite.json();
  assert.equal(invite.status, 201, JSON.stringify(invitePayload));
  const invitation = invitePayload.data;
  const accept = await fetch(`${apiBase}/api/v1/employees/invitations/${invitation.id}/accept`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({
      invitationToken: invitation.invitationToken,
      displayName: `SYS24 Advisor ${stamp}`,
    }),
  });
  const acceptPayload = await accept.json();
  assert.equal(accept.status, 201, JSON.stringify(acceptPayload));
  const employeeId = acceptPayload.data.id;

  const transfer = await fetch(`${apiBase}/api/v1/customers/${source.id}/ownership-transfers`, {
    method: 'POST',
    headers: headers(token, `sys24-transfer-${stamp}`),
    body: JSON.stringify({
      customerVersion: source.version,
      toEmployeeId: employeeId,
      reason: 'SYS24 ownership handoff',
    }),
  });
  const transferPayload = await transfer.json();
  assert.equal(transfer.status, 201, JSON.stringify(transferPayload));
  const transferData = transferPayload.data;
  const approved = await fetch(`${apiBase}/api/v1/ownership-transfers/${transferData.id}/approve`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ version: transferData.version, decision: 'approve' }),
  });
  const approvedPayload = await approved.json();
  assert.equal(approved.status, 201, JSON.stringify(approvedPayload));

  const afterTransfer = await fetch(`${apiBase}/api/v1/management/customers/${source.id}`, {
    headers: headers(token),
  });
  assert.equal(afterTransfer.status, 200);
  const afterTransferData = (await afterTransfer.json()).data;
  assert.ok(afterTransferData.customer.version > source.version);
  assert.ok(afterTransferData.transfers.some((item) => item.status === 'approved'));

  const merged = await fetch(`${apiBase}/api/v1/customers/${source.id}/merge`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({
      targetCustomerId: target.id,
      sourceVersion: afterTransferData.customer.version,
      targetVersion: target.version,
      reason: 'SYS24 duplicate profiles',
    }),
  });
  const mergedPayload = await merged.json();
  assert.equal(merged.status, 201, JSON.stringify(mergedPayload));

  const mergedDetail = await fetch(`${apiBase}/api/v1/management/customers/${source.id}`, {
    headers: headers(token),
  });
  assert.equal(mergedDetail.status, 200);
  const mergedData = (await mergedDetail.json()).data;
  assert.equal(mergedData.customer.status, 'merged');
  assert.equal(mergedData.customer.mergedIntoId, target.id);
});
