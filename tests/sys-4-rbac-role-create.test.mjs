/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const base = 'http://127.0.0.1:3275';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3275',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'sys-4-rbac-role-create',
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

test('SYS-4: RBAC role create reuses existing /api/v1/rbac/roles', async () => {
  await ready();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const tenantId = randomUUID();
  const ownerId = randomUUID();
  const readerId = randomUUID();
  const ownerRoleId = randomUUID();
  const readerRoleId = randomUUID();
  const ownerMembershipId = randomUUID();
  const readerMembershipId = randomUUID();
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(
      "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [tenantId, `sys4-rbac-${stamp}`, `SYS4 RBAC ${stamp}`],
    );
    for (const [id, email, name] of [
      [ownerId, `owner-rbac-${stamp}@example.local`, 'Owner'],
      [readerId, `reader-rbac-${stamp}@example.local`, 'Reader'],
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
    const tenantRead = (
      await client.query("select id from permissions where code='tenant.read' limit 1")
    ).rows[0].id;
    await client.query(
      "insert into role_permissions(id,tenant_id,role_id,permission_id,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null),($5,$2,$3,$6,'active',null,null)",
      [randomUUID(), tenantId, ownerRoleId, tenantManage, randomUUID(), tenantRead],
    );
    await client.query(
      "insert into role_permissions(id,tenant_id,role_id,permission_id,status,created_by,updated_by) values($1,$2,$3,$4,'active',null,null)",
      [randomUUID(), tenantId, readerRoleId, tenantRead],
    );
  } finally {
    await client.end();
  }

  const ownerToken = await login(`owner-rbac-${stamp}@example.local`, 'ChangeMe123!', tenantId);
  const readerToken = await login(`reader-rbac-${stamp}@example.local`, 'ChangeMe123!', tenantId);
  const code = `pack_${stamp}`;
  const denied = await fetch(`${base}/api/v1/rbac/roles`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${readerToken}`,
      'x-tenant-context': tenantId,
      'x-request-id': randomUUID(),
      'content-type': 'application/json',
      'idempotency-key': randomUUID(),
    },
    body: JSON.stringify({ code, name: `Pack ${stamp}` }),
  });
  assert.equal(denied.status, 403);

  const created = await fetch(`${base}/api/v1/rbac/roles`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${ownerToken}`,
      'x-tenant-context': tenantId,
      'x-request-id': randomUUID(),
      'content-type': 'application/json',
      'idempotency-key': randomUUID(),
    },
    body: JSON.stringify({ code, name: `Pack ${stamp}` }),
  });
  assert.equal(created.status, 201);
  const role = (await created.json()).data;
  assert.equal(role.code, code);

  const listed = await fetch(`${base}/api/v1/rbac/roles`, {
    headers: {
      authorization: `Bearer ${ownerToken}`,
      'x-tenant-context': tenantId,
      'x-request-id': randomUUID(),
    },
  });
  assert.equal(listed.status, 200);
  assert.ok((await listed.json()).data.some((item) => item.id === role.id));
});
