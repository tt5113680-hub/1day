/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const base = 'http://127.0.0.1:3361';
const systemTenant = '00000000-0000-4000-8000-000000000001';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3361',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'matrix-mg-f-partial-p0',
  },
  stdio: 'ignore',
});

async function ready() {
  for (let i = 0; i < 50; i += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      // starting
    }
    await wait(100);
  }
  throw Error('API did not start');
}

async function login(email, password, tenantId, deviceName) {
  const response = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, tenantId, deviceName }),
  });
  assert.equal(response.status, 201);
  return response.json();
}

function headers(token, tenantId, extra = {}) {
  return {
    authorization: `Bearer ${token}`,
    'x-tenant-context': tenantId,
    'x-request-id': randomUUID(),
    'content-type': 'application/json',
    ...extra,
  };
}

async function provision(systemToken, suffix, industry = 'restaurant') {
  const slug = `mgf-${suffix}`;
  const email = `${slug}@example.test`;
  const password = `Mgf-${suffix}-Password!`;
  const response = await fetch(`${base}/api/v1/platform/onboarding`, {
    method: 'POST',
    headers: headers(systemToken, systemTenant, { 'idempotency-key': randomUUID() }),
    body: JSON.stringify({
      slug,
      tenantName: `MGF ${suffix}`,
      organizationName: 'MGF HQ',
      merchantName: 'MGF Merchant',
      storeName: 'MGF Store',
      address: '1 MGF Road',
      phone: '021-55553661',
      businessHours: '09:00-21:00',
      adminName: 'MGF Owner',
      adminEmail: email,
      adminPassword: password,
      industry,
      plan: 'starter',
    }),
  });
  assert.equal(response.status, 201);
  const run = (await response.json()).data;
  assert.equal(run.state, 'ready');
  const storeId = run.steps.find((step) => step.code === 'organization_store').output.storeId;
  return { slug, email, password, run, storeId };
}

test.after(() => api.kill());

test('MB-01 enrollment idempotency, phone reuse, and consent revoke hide wallet', async () => {
  await ready();
  const system = await login('admin@system.local', 'ChangeMe123!', systemTenant);
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const { slug, storeId } = await provision(system.accessToken, `mb-${suffix}`);
  const phone = '13900139001';
  const enrollKey = randomUUID();
  const enroll = (key) =>
    fetch(`${base}/api/v1/consumer/memberships/enroll?tenant=${slug}`, {
      method: 'POST',
      headers: { 'idempotency-key': key, 'content-type': 'application/json' },
      body: JSON.stringify({ storeId, phone, consent: true }),
    });
  const first = await enroll(enrollKey);
  assert.equal(first.status, 201);
  const member = (await first.json()).data;
  assert.ok(member.enrollmentId);
  assert.equal((await enroll(enrollKey)).status, 201);
  assert.equal((await (await enroll(enrollKey)).json()).data.enrollmentId, member.enrollmentId);

  const reuse = await enroll(randomUUID());
  assert.equal(reuse.status, 201);
  const reused = (await reuse.json()).data;
  assert.equal(reused.enrollmentId, member.enrollmentId);
  assert.notEqual(reused.profileAccessId, member.profileAccessId);

  const walletOk = await fetch(
    `${base}/api/v1/consumer/memberships/wallet?tenant=${slug}&accessId=${reused.profileAccessId}&access=${reused.profileAccess}`,
  );
  assert.equal(walletOk.status, 200);

  const revoke = await fetch(
    `${base}/api/v1/consumer/profile/${reused.profileAccessId}/consent/revoke?tenant=${slug}&access=${reused.profileAccess}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': randomUUID() },
      body: JSON.stringify({ version: 1 }),
    },
  );
  assert.equal(revoke.status, 201);
  assert.equal((await revoke.json()).data.consent_status, 'revoked');
  assert.equal(
    (
      await fetch(
        `${base}/api/v1/consumer/memberships/wallet?tenant=${slug}&accessId=${reused.profileAccessId}&access=${reused.profileAccess}`,
      )
    ).status,
    404,
  );
});

test('SE-01 multi-device revoke keeps sibling session; P-02 suspend revokes refresh', async () => {
  await ready();
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const system = await login('admin@system.local', 'ChangeMe123!', systemTenant);
    const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const { slug, email, password, run } = await provision(system.accessToken, `se-${suffix}`);
    const phone = await login(email, password, run.tenantId, 'phone-a');
    const tablet = await login(email, password, run.tenantId, 'tablet-b');
    const sessions = await client.query(
      "select id,device_name from auth_sessions where tenant_id=$1 and status='active' and revoked_at is null order by device_name",
      [run.tenantId],
    );
    assert.ok(sessions.rowCount >= 2);
    const phoneSession = sessions.rows.find((row) => row.device_name === 'phone-a');
    assert.ok(phoneSession);

    const revoke = await fetch(`${base}/api/v1/auth/sessions/${phoneSession.id}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${phone.accessToken}` },
    });
    assert.ok(revoke.status === 200 || revoke.status === 201);

    assert.equal(
      (
        await fetch(`${base}/api/v1/management/dashboard`, {
          headers: headers(phone.accessToken, run.tenantId),
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/dashboard`, {
          headers: headers(tablet.accessToken, run.tenantId),
        })
      ).status,
      200,
    );

    const tenantRow = await client.query('select version from tenants where id=$1', [run.tenantId]);
    const suspend = await fetch(`${base}/api/v1/platform/tenants/${run.tenantId}`, {
      method: 'PUT',
      headers: headers(system.accessToken, systemTenant, { 'idempotency-key': randomUUID() }),
      body: JSON.stringify({
        version: tenantRow.rows[0].version,
        plan: 'starter',
        riskLevel: 'low',
        quotas: { users: 10, customers: 1000, stores: 3 },
        status: 'suspended',
        confirmation: `SUSPEND:${slug}`,
      }),
    });
    assert.equal(suspend.status, 200);
    const refresh = await fetch(`${base}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: tablet.refreshToken }),
    });
    assert.equal(refresh.status, 401);
    const active = await client.query(
      "select count(*)::int as n from auth_sessions where tenant_id=$1 and status='active' and revoked_at is null",
      [run.tenantId],
    );
    assert.equal(active.rows[0].n, 0);
  } finally {
    await client.end();
  }
});

test('CT-01 management placement writes content_store_placements only (no store_content_items dual-write)', async () => {
  await ready();
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const system = await login('admin@system.local', 'ChangeMe123!', systemTenant);
    const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const { slug, email, password, run, storeId } = await provision(
      system.accessToken,
      `ct-${suffix}`,
      'education',
    );
    const owner = await login(email, password, run.tenantId);
    const title = `CT01 source ${suffix}`;
    const created = await fetch(`${base}/api/v1/management/content`, {
      method: 'POST',
      headers: headers(owner.accessToken, run.tenantId, { 'idempotency-key': randomUUID() }),
      body: JSON.stringify({ kind: 'article', title, body: 'unique content truth' }),
    });
    const createdBody = await created.json();
    assert.equal(created.status, 201, JSON.stringify(createdBody));
    const item = createdBody.data;
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/content/${item.id}/approve`, {
          method: 'POST',
          headers: headers(owner.accessToken, run.tenantId),
          body: JSON.stringify({ version: item.version }),
        })
      ).status,
      201,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/content/${item.id}/placements`, {
          method: 'POST',
          headers: headers(owner.accessToken, run.tenantId),
          body: JSON.stringify({ storeId, rank: 500 }),
        })
      ).status,
      201,
    );
    const placements = await client.query(
      'select count(*)::int as n from content_store_placements where tenant_id=$1 and content_id=$2 and store_id=$3 and deleted_at is null',
      [run.tenantId, item.id, storeId],
    );
    assert.equal(placements.rows[0].n, 1);
    const legacy = await client.query(
      'select count(*)::int as n from store_content_items where tenant_id=$1 and title=$2 and deleted_at is null',
      [run.tenantId, title],
    );
    assert.equal(legacy.rows[0].n, 0);
    const consumer = await fetch(`${base}/api/v1/consumer/stores/${storeId}?tenant=${slug}`);
    assert.equal(consumer.status, 200);
    const payload = JSON.stringify(await consumer.json());
    assert.match(payload, new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  } finally {
    await client.end();
  }
});

test('M-01 store_manager API denials cannot be bypassed by UI-hidden routes', async () => {
  await ready();
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const system = await login('admin@system.local', 'ChangeMe123!', systemTenant);
    const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const { email, password, run } = await provision(system.accessToken, `m01-${suffix}`);
    const owner = await login(email, password, run.tenantId);
    const managerUserId = randomUUID();
    const membershipId = randomUUID();
    const managerEmail = `manager-${suffix}@example.test`;
    await client.query(
      "insert into users(id,email,display_name,password_hash,status,created_by,updated_by) select $1,$2,'Store Manager',password_hash,'active',null,null from users where email=$3",
      [managerUserId, managerEmail, email],
    );
    await client.query(
      "insert into memberships(id,tenant_id,user_id,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [membershipId, run.tenantId, managerUserId],
    );
    const role = await client.query(
      "select id from roles where tenant_id=$1 and code='store_manager' and deleted_at is null",
      [run.tenantId],
    );
    assert.equal(role.rowCount, 1);
    await client.query(
      'insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,$4)',
      [randomUUID(), run.tenantId, membershipId, role.rows[0].id],
    );
    const manager = await login(managerEmail, password, run.tenantId);

    assert.equal(
      (
        await fetch(`${base}/api/v1/auth/permissions/tenant.manage`, {
          headers: headers(manager.accessToken, run.tenantId),
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/dashboard`, {
          headers: headers(manager.accessToken, run.tenantId),
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/content`, {
          headers: headers(manager.accessToken, run.tenantId),
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/auth/permissions/tenant.read`, {
          headers: headers(manager.accessToken, run.tenantId),
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await fetch(`${base}/api/v1/management/dashboard`, {
          headers: headers(owner.accessToken, run.tenantId),
        })
      ).status,
      200,
    );
  } finally {
    await client.end();
  }
});

test('WO-01 concurrent OutboxDispatchers claim each event once via SKIP LOCKED', async () => {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  const stamp = Date.now();
  const tenantId = randomUUID();
  const eventId = randomUUID();
  try {
    await client.query(
      "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [tenantId, `wo01-${stamp}`, `WO01 ${stamp}`],
    );
    await client.query(
      "insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,created_by,updated_by) values($1,$2,'worker.wo01.v1','worker_wo01',$3,$4,$5,'matrix-wo01',null,null)",
      [eventId, tenantId, randomUUID(), {}, randomUUID()],
    );
    const { OutboxDispatcher } = await import('../packages/events/dist/index.js');
    const consumer = `matrix-wo01-${stamp}`;
    const a = new OutboxDispatcher(databaseUrl, consumer, async () => undefined, tenantId);
    const b = new OutboxDispatcher(databaseUrl, consumer, async () => undefined, tenantId);
    const [ra, rb] = await Promise.all([a.dispatch(10), b.dispatch(10)]);
    await a.close();
    await b.close();
    assert.equal(ra.published + rb.published + ra.skipped + rb.skipped, 1);
    assert.equal(ra.published + rb.published, 1);
    const consumptions = await client.query(
      'select count(*)::int as n from event_consumptions where tenant_id=$1 and event_id=$2 and consumer_name=$3',
      [tenantId, eventId, consumer],
    );
    assert.equal(consumptions.rows[0].n, 1);
    const status = await client.query('select status from outbox_events where id=$1', [eventId]);
    assert.equal(status.rows[0].status, 'published');
  } finally {
    await client.end();
  }
});
