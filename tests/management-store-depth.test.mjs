/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const tenant = '00000000-0000-4000-8000-000000000001';
const base = 'http://127.0.0.1:3083';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3083',
    DATABASE_URL: db,
    AUTH_TOKEN_SECRET: 'management-store-depth-111',
  },
  stdio: 'ignore',
});
const headers = (token, extra = {}) => ({
  authorization: `Bearer ${token}`,
  'x-request-id': randomUUID(),
  ...extra,
});
const jsonHeaders = (token, extra = {}) => ({
  ...headers(token, extra),
  'content-type': 'application/json',
});
async function ready() {
  for (let i = 0; i < 40; i += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      /* starting */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw Error('API did not start');
}
async function login(email) {
  const response = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'ChangeMe123!', tenantId: tenant }),
  });
  assert.equal(response.status, 201);
  return (await response.json()).accessToken;
}

test.after(() => api.kill());
test('G1-W111: store CRUD + three contact QR codes round-trip with real DB', async () => {
  await ready();
  const client = new Client({ connectionString: db });
  await client.connect();
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const organization = randomUUID();
  const owner = { user: randomUUID(), membership: randomUUID(), employee: randomUUID() };
  const merchant = randomUUID();
  const store = randomUUID();
  try {
    await client.query(
      "insert into organizations(id,tenant_id,code,name,organization_type,status,created_by,updated_by) values($1,$2,$3,'SD org','team','active',null,null)",
      [organization, tenant, `sd-org-${stamp}`],
    );
    await client.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,$3,password_hash,'active',null,null from users where email='admin@system.local'",
      [owner.user, `SDOWN-${stamp}@example.test`, 'Store depth owner'],
    );
    await client.query(
      "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [owner.membership, tenant, owner.user],
    );
    await client.query(
      'insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,$4)',
      [randomUUID(), tenant, owner.membership, '00000000-0000-4000-8000-000000000004'],
    );
    await client.query(
      "insert into employees(id,tenant_id,membership_id,organization_id,employee_code,title,status,created_by,updated_by) values($1,$2,$3,$4,$5,'Advisor','active',null,null)",
      [owner.employee, tenant, owner.membership, organization, `SDE-${stamp}`],
    );
    await client.query(
      "insert into merchants(id,tenant_id,organization_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,$5,'active',null,null)",
      [merchant, tenant, organization, `SDM-${stamp}`, `W111 merchant ${stamp}`],
    );
    await client.query(
      "insert into stores(id,tenant_id,organization_id,merchant_id,code,name,status,created_by,updated_by) values($1,$2,$3,$4,$5,$6,'active',null,null)",
      [store, tenant, organization, merchant, `SD-BASE-${stamp}`, `Base store ${stamp}`],
    );
    const ownerToken = await login(`SDOWN-${stamp}@example.test`);

    // cross-tenant guard
    const guarded = await fetch(`${base}/api/v1/management/stores/depth`, {
      method: 'POST',
      headers: jsonHeaders(ownerToken, { 'x-tenant-context': randomUUID(), 'idempotency-key': randomUUID() }),
      body: JSON.stringify({ code: `SDX-${stamp}`, name: 'x' }),
    });
    assert.ok([403, 404].includes(guarded.status), 'wrong tenant denied (403/404, no leak)');

    // create store (idempotent)
    const createKey = randomUUID();
    const create = await fetch(`${base}/api/v1/management/stores/depth`, {
      method: 'POST',
      headers: jsonHeaders(ownerToken, { 'idempotency-key': createKey }),
      body: JSON.stringify({
        code: `SD-NEW-${stamp.slice(-8)}`,
        name: `New store ${stamp}`,
        merchantId: merchant,
        address: '浦东 xxx 路 1 号',
        phone: '021-40000000',
        businessHours: '每日 09:00-21:00',
      }),
    });
    assert.equal(create.status, 201);
    const created = (await create.json()).data;
    assert.equal(created.status, 'active', 'store created as active');
    assert.ok(created.id && created.merchantId, 'created store has id + merchantId');

    // idempotent replay returns same id
    const replay = await fetch(`${base}/api/v1/management/stores/depth`, {
      method: 'POST',
      headers: jsonHeaders(ownerToken, { 'idempotency-key': createKey }),
      body: JSON.stringify({
        code: `SD-NEW-${stamp.slice(-8)}`,
        name: `New store ${stamp}`,
        merchantId: merchant,
        address: '浦东 xxx 路 1 号',
        phone: '021-40000000',
        businessHours: '每日 09:00-21:00',
      }),
    });
    assert.equal(replay.status, 201);
    assert.equal((await replay.json()).data.id, created.id, 'idempotent replay returns same store');

    // update store (bump version)
    const update = await fetch(`${base}/api/v1/management/stores/depth/${created.id}`, {
      method: 'PUT',
      headers: jsonHeaders(ownerToken),
      body: JSON.stringify({ name: `Renamed store ${stamp}`, status: 'inactive', version: created.version }),
    });
    assert.equal(update.status, 200);
    const updated = (await update.json()).data;
    assert.equal(updated.name, `Renamed store ${stamp}`);
    assert.equal(updated.status, 'inactive');
    assert.equal(updated.version, created.version + 1);

    // qr codes: three contact types with real target paths
    const qr = await fetch(`${base}/api/v1/management/stores/depth/${created.id}/qr-codes`, {
      headers: headers(ownerToken),
    });
    assert.equal(qr.status, 200);
    const qrData = (await qr.json()).data;
    assert.equal(qrData.storeId, created.id);
    assert.equal(qrData.contacts.length, 3, 'three contact-type entries');
    const types = qrData.contacts.map((c) => c.contactType).sort();
    assert.deepEqual(types, ['employee', 'merchant', 'store']);
    const merchantQr = qrData.contacts.find((c) => c.contactType === 'merchant');
    const storeQr = qrData.contacts.find((c) => c.contactType === 'store');
    const employeeQr = qrData.contacts.find((c) => c.contactType === 'employee');
    assert.ok(merchantQr.token && merchantQr.label.includes('商户码'));
    assert.ok(storeQr.targetPath.includes(`/c/stores/${created.id}`));
    assert.ok(employeeQr.targetPath.includes('surface=employee-qr'));
    assert.ok(employeeQr.label.includes('员工码'));

    // delete -> soft deleted (removed from depth list via 404 on update/delete again)
    const remove = await fetch(`${base}/api/v1/management/stores/depth/${created.id}`, {
      method: 'DELETE',
      headers: headers(ownerToken),
    });
    assert.equal(remove.status, 200);
    const confirm = await fetch(`${base}/api/v1/management/stores/depth/${created.id}`, {
      method: 'DELETE',
      headers: headers(ownerToken),
    });
    assert.equal(confirm.status, 404, 'second delete is 404 (soft deleted)');

    // audit + outbox written for created store
    const audit = await client.query(
      "select action from audit_logs where tenant_id=$1 and resource_type='store' and resource_id=$2 and deleted_at is null",
      [tenant, created.id],
    );
    const auditActions = audit.rows.map((r) => r.action);
    assert.ok(auditActions.includes('store.created'), 'audit store.created');
    assert.ok(auditActions.includes('store.updated'), 'audit store.updated');
    assert.ok(auditActions.includes('store.deleted'), 'audit store.deleted');
    const outbox = await client.query(
      "select event_type from outbox_events where tenant_id=$1 and aggregate_type='store' and aggregate_id=$2",
      [tenant, created.id],
    );
    const outboxTypes = outbox.rows.map((r) => r.event_type);
    assert.ok(outboxTypes.includes('store.created.v1'), 'outbox store.created.v1');
    assert.ok(outboxTypes.includes('store.updated.v1'), 'outbox store.updated.v1');
    assert.ok(outboxTypes.includes('store.deleted.v1'), 'outbox store.deleted.v1');

    // qr registry rows exist with three contact types
    const qrRows = await client.query(
      "select contact_type from store_contact_qr_codes where tenant_id=$1 and store_id=$2 and deleted_at is null",
      [tenant, created.id],
    );
    assert.deepEqual(
      qrRows.rows.map((r) => r.contact_type).sort(),
      ['employee', 'merchant', 'store'],
      'qr registry rows persisted',
    );
  } finally {
    await client.end();
  }
});
