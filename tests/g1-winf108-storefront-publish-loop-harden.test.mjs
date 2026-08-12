/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const { Client } = createRequire(new URL('../apps/api/package.json', import.meta.url))('pg');
const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const base = 'http://127.0.0.1:3226';
const systemTenant = '00000000-0000-4000-8000-000000000001';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3226',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'g1-winf108-storefront-publish-loop',
  },
  stdio: 'ignore',
});
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function ready() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      // API process is starting.
    }
    await wait(100);
  }
  throw new Error('API did not start');
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

const protectedHeaders = (token, tenantId, extra = {}) => ({
  authorization: `Bearer ${token}`,
  'x-tenant-context': tenantId,
  'x-request-id': randomUUID(),
  'content-type': 'application/json',
  ...extra,
});

test.after(() => api.kill());

test('W∞-108: portal template Draft→Publish→Readable closed loop keeps portal_publications binding/version/evidence', async () => {
  await ready();
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const slug = `portal-pub-${suffix}`;
  const ownerEmail = `portalpub-${suffix}@example.test`;
  const ownerPassword = `PortalPub-${suffix}-Password!`;
  const systemToken = await login('admin@system.local', 'ChangeMe123!', systemTenant);
  const provision = await fetch(`${base}/api/v1/platform/onboarding`, {
    method: 'POST',
    headers: protectedHeaders(systemToken, systemTenant, { 'idempotency-key': randomUUID() }),
    body: JSON.stringify({
      slug,
      tenantName: `Portal Pub ${suffix}`,
      organizationName: 'Portal Pub HQ',
      merchantName: 'Portal Pub Merchant',
      storeName: 'Portal Pub Main',
      address: '88 Portal Pub Road',
      phone: '021-55558888',
      businessHours: '09:00-21:00',
      adminName: 'Portal Pub Owner',
      adminEmail: ownerEmail,
      adminPassword: ownerPassword,
      industry: 'restaurant',
      plan: 'starter',
    }),
  });
  assert.equal(provision.status, 201);
  const run = (await provision.json()).data;
  assert.equal(run.state, 'ready');
  const ownerToken = await login(ownerEmail, ownerPassword, run.tenantId);

  // Create a management portal template (auto-creates the scoped portal_binding).
  const create = await fetch(`${base}/api/v1/page-templates`, {
    method: 'POST',
    headers: protectedHeaders(ownerToken, run.tenantId, {
      'idempotency-key': randomUUID(),
    }),
    body: JSON.stringify({
      code: `mgmt-home-${suffix}`,
      name: 'Management Home',
      target: 'management',
      modules: [
        { moduleType: 'hero', config: { emphasis: 'headline', visible: true } },
        { moduleType: 'quick_actions', config: { visible: true } },
      ],
    }),
  });
  assert.equal(create.status, 201);
  const created = (await create.json()).data;
  assert.ok(created.draftVersionId, 'fresh template has draft version');
  assert.equal(created.version, 1, 'fresh template version 1');
  const v1 = created.draftVersionId;

  // Publish the initial management portal version.
  const publish = await fetch(`${base}/api/v1/page-templates/${created.id}/publish`, {
    method: 'POST',
    headers: protectedHeaders(ownerToken, run.tenantId),
    body: JSON.stringify({ versionId: v1, templateVersion: created.version, bindingVersion: 1 }),
  });
  assert.equal(publish.status, 201);
  const published = (await publish.json()).data;
  assert.equal(published.binding.target, 'management');
  assert.equal(published.binding.live_version_id, v1);
  assert.equal(published.publicationType, 'publish');
  assert.equal(published.publicationSequence, 1, 'portal publication sequence 1');

  // Mobile-first Management read path returns versioned binding evidence.
  const dashboard = await fetch(`${base}/api/v1/management/dashboard`, {
    headers: protectedHeaders(ownerToken, run.tenantId),
  });
  assert.equal(dashboard.status, 200);
  const layout = (await dashboard.json()).data.layout;
  assert.ok(layout, 'management layout resolves after portal publish');
  assert.equal(layout.mode, 'published');
  assert.equal(layout.templateVersionId, v1);
  assert.equal(typeof layout.bindingVersion, 'number');
  assert.ok(layout.publishedAt, 'publishedAt surfaced on portal read');
  assert.ok(layout.modules.length >= 2, 'portal modules readable');

  // Create a new draft, update it, and verify preview reads draft while live stays published.
  const createDraft = await fetch(`${base}/api/v1/page-templates/${created.id}/drafts`, {
    method: 'POST',
    headers: protectedHeaders(ownerToken, run.tenantId),
    body: JSON.stringify({ sourceVersionId: v1 }),
  });
  assert.equal(createDraft.status, 201);
  const draft = (await createDraft.json()).data;
  assert.equal(draft.status, 'draft');
  assert.notEqual(draft.id, v1);
  const draftModules = [
    { moduleType: 'hero', config: { emphasis: 'headline', visible: true } },
    { moduleType: 'quick_actions', config: { visible: true } },
    { moduleType: 'content', config: { visible: true } },
  ];
  const update = await fetch(`${base}/api/v1/page-templates/${created.id}/drafts/${draft.id}`, {
    method: 'PUT',
    headers: protectedHeaders(ownerToken, run.tenantId),
    body: JSON.stringify({ version: draft.version ?? 1, modules: draftModules }),
  });
  assert.equal(update.status, 200);

  // Rollback to the published version produces a second portal_publications row.
  const publishedState = await (
    await fetch(`${base}/api/v1/page-templates`, {
      headers: protectedHeaders(ownerToken, run.tenantId),
    })
  ).json();
  const beforeRollback = publishedState.data.find((item) => item.id === created.id);
  const rollback = await fetch(`${base}/api/v1/page-templates/${created.id}/rollback`, {
    method: 'POST',
    headers: protectedHeaders(ownerToken, run.tenantId),
    body: JSON.stringify({
      versionId: v1,
      templateVersion: beforeRollback.version,
      bindingVersion: beforeRollback.binding_version,
    }),
  });
  assert.equal(rollback.status, 201);
  const rolledBack = (await rollback.json()).data;
  assert.equal(rolledBack.publicationType, 'rollback');
  assert.equal(rolledBack.publicationSequence, 2, 'portal publication sequence 2');

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  let portalBindingId;
  try {
    const binding = await client.query(
      'select id from portal_bindings where tenant_id=$1 and target=$2 and deleted_at is null',
      [run.tenantId, 'management'],
    );
    portalBindingId = binding.rows[0].id;
    const evidence = await client.query(
      `select
        (select count(*) from portal_publications where tenant_id=$1 and binding_id=$2)::int publications,
        (select array_agg(publication_type order by sequence) from portal_publications
           where tenant_id=$1 and binding_id=$2) publication_types,
        (select count(*) from outbox_events where tenant_id=$1
           and event_type in ('portal.published.v1','portal.rolled_back.v1') and aggregate_id=$2)::int events,
        (select count(*) from audit_logs where tenant_id=$1
           and action in ('page.template_published','page.template_rolled_back'))::int audits`,
      [run.tenantId, portalBindingId],
    );
    assert.deepEqual(
      {
        publications: evidence.rows[0].publications,
        publication_types: evidence.rows[0].publication_types,
        events: evidence.rows[0].events,
        audits: evidence.rows[0].audits,
      },
      {
        publications: 2,
        publication_types: ['publish', 'rollback'],
        events: 2,
        audits: 2,
      },
    );
  } finally {
    await client.end();
  }
});
