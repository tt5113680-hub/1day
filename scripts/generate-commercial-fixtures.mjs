import { randomUUID } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { INDUSTRIES, industryPacks } from './lib/commercial-fixture-catalog.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(root, 'packages/database/package.json'));
const { Pool } = require('pg');
const fixturesPublic = join(root, 'apps/consumer-web/public/fixtures');
const materialsDir = join(fixturesPublic, 'materials');
const storesDir = join(fixturesPublic, 'stores');

const args = Object.fromEntries(
  process.argv.slice(2).map((part) => {
    const [key, ...rest] = part.replace(/^--/, '').split('=');
    return [key, rest.join('=') || 'true'];
  }),
);

const count = Math.min(3, Math.max(1, Number(args.count || 3)));
const apiBase = (args.api || process.env.FIXTURE_API_BASE || 'http://127.0.0.1:3200').replace(
  /\/$/,
  '',
);
const databaseUrl =
  args.databaseUrl ||
  process.env.DATABASE_URL ||
  'postgresql://oneday:oneday_local_only@127.0.0.1:5434/oneday_human_pilot';
const systemTenant =
  args.systemTenant || process.env.FIXTURE_SYSTEM_TENANT || '00000000-0000-4000-8000-000000000001';
const systemEmail =
  args.systemEmail || process.env.FIXTURE_SYSTEM_EMAIL || 'pilot.platform@oneday.local';
const systemPassword =
  args.systemPassword || process.env.FIXTURE_SYSTEM_PASSWORD || 'OnedayHumanPilot!2026';
const consumerBase = (
  args.consumer ||
  process.env.FIXTURE_CONSUMER_BASE ||
  'http://127.0.0.1:3201'
).replace(/\/$/, '');
const outDir = args.out || join(root, 'evidence/COMMERCIAL-FIXTURES');
const stamp = args.stamp || `${Date.now()}`;
const prefix = (args.prefix || 'fx').replace(/[^a-z0-9-]/gi, '').toLowerCase() || 'fx';

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])) >>> 0, 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return ~c;
}

function writeSolidPng(path, rgb) {
  const [r, g, b] = rgb;
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(64, 0);
  ihdr.writeUInt32BE(64, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const raw = Buffer.alloc(64 * (1 + 64 * 3));
  for (let y = 0; y < 64; y += 1) {
    const row = y * (1 + 192);
    raw[row] = 0;
    for (let x = 0; x < 64; x += 1) {
      const i = row + 1 + x * 3;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
    }
  }
  writeFileSync(
    path,
    Buffer.concat([
      signature,
      pngChunk('IHDR', ihdr),
      pngChunk('IDAT', deflateSync(raw)),
      pngChunk('IEND', Buffer.alloc(0)),
    ]),
  );
}

function ensureMaterials() {
  mkdirSync(materialsDir, { recursive: true });
  mkdirSync(storesDir, { recursive: true });
  const palette = {
    'restaurant-a.png': [196, 120, 72],
    'restaurant-story-a.png': [210, 150, 90],
    'restaurant-story-b.png': [180, 100, 60],
    'beauty-a.png': [180, 140, 170],
    'beauty-story-a.png': [200, 160, 190],
    'education-a.png': [80, 140, 180],
    'education-story-a.png': [100, 160, 200],
  };
  const sourceCoffee = join(root, 'apps/consumer-web/public/storefront/guomao-coffee.png');
  for (const [name, rgb] of Object.entries(palette)) {
    const target = name.includes('story') ? join(materialsDir, name) : join(storesDir, name);
    if (existsSync(target)) continue;
    if (name === 'restaurant-a.png' && existsSync(sourceCoffee)) copyFileSync(sourceCoffee, target);
    else writeSolidPng(target, rgb);
  }
}

async function request(path, { method = 'GET', token, tenant, body, idempotencyKey } = {}) {
  const headers = { 'content-type': 'application/json', 'x-request-id': randomUUID() };
  if (token) headers.authorization = `Bearer ${token}`;
  if (tenant) headers['x-tenant-context'] = tenant;
  if (idempotencyKey) headers['idempotency-key'] = idempotencyKey;
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: response.status, json };
}

async function login(email, password, tenantId) {
  const { status, json } = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { email, password, tenantId },
  });
  if (status !== 201) throw new Error(`login failed ${email}: ${status} ${JSON.stringify(json)}`);
  return json.accessToken;
}

async function provisionTenant(systemToken, industry, index) {
  const pack = industryPacks[industry];
  const slug = `${prefix}-${industry}-${stamp}-${index + 1}`.slice(0, 60);
  const email = `${slug}@oneday.fixture.local`;
  const password = `Fixture-${stamp}-${index + 1}!Aa`;
  const storeMeta = pack.stores[0];
  const { status, json } = await request('/api/v1/platform/onboarding', {
    method: 'POST',
    token: systemToken,
    tenant: systemTenant,
    idempotencyKey: randomUUID(),
    body: {
      slug,
      tenantName: `${pack.label}夹具${index + 1} · TEST ONLY`,
      organizationName: `${pack.label}夹具总部`,
      merchantName: `${pack.label}夹具商户`,
      storeName: `${pack.label}${storeMeta.nameSuffix}`,
      address: storeMeta.address,
      phone: storeMeta.phone,
      businessHours: storeMeta.businessHours,
      latitude: storeMeta.latitude,
      longitude: storeMeta.longitude,
      adminName: `${pack.label}夹具老板`,
      adminEmail: email,
      adminPassword: password,
      industry,
      plan: 'starter',
      themeVariant: pack.themeVariant,
    },
  });
  if (status !== 201)
    throw new Error(`provision ${slug} failed: ${status} ${JSON.stringify(json)}`);
  const run = json.data;
  if (run.state !== 'ready') throw new Error(`provision ${slug} not ready: ${run.state}`);
  const storeId = run.steps.find((step) => step.code === 'organization_store')?.output?.storeId;
  if (!storeId) throw new Error(`provision ${slug} missing storeId`);
  return { slug, email, password, run, storeId, industry, pack };
}

async function enrichTenant(tenant) {
  const ownerToken = await login(tenant.email, tenant.password, tenant.run.tenantId);
  const base = { token: ownerToken, tenant: tenant.run.tenantId };
  const storeMeta = tenant.pack.stores[0];

  const commercial = await request(`/api/v1/management/stores/${tenant.storeId}/commercial`, {
    method: 'PUT',
    ...base,
    body: {
      phone: storeMeta.phone,
      businessHours: storeMeta.businessHours,
      latitude: storeMeta.latitude,
      longitude: storeMeta.longitude,
    },
  });
  if (![200, 201].includes(commercial.status)) {
    throw new Error(
      `commercial update failed: ${commercial.status} ${JSON.stringify(commercial.json)}`,
    );
  }

  let sort = 10;
  for (const link of tenant.pack.links) {
    const created = await request(`/api/v1/management/stores/${tenant.storeId}/external-links`, {
      method: 'POST',
      ...base,
      body: {
        title: link.title,
        description: link.description,
        targetUrl: link.targetUrl,
        platformType: link.platform,
        enabled: true,
        sortOrder: sort,
      },
    });
    if (created.status !== 201) {
      throw new Error(`external link ${link.platform} failed: ${JSON.stringify(created.json)}`);
    }
    sort += 10;
  }

  const catalog = await request('/api/v1/management/catalog', base);
  if (catalog.status !== 200) throw new Error(`catalog list failed: ${catalog.status}`);
  const storeRow = catalog.json.data.find((item) => item.id === tenant.storeId);
  const linkIds = {};
  for (const link of storeRow?.externalLinks ?? []) {
    const platform = link.platform || link.platformType;
    if (platform) linkIds[platform] = link.actionId;
  }

  const services = [];
  for (const product of tenant.pack.products) {
    const created = await request(`/api/v1/management/catalog/stores/${tenant.storeId}/services`, {
      method: 'POST',
      ...base,
      idempotencyKey: randomUUID(),
      body: {
        code: `${product.code}-${stamp}`.slice(0, 48),
        name: product.name,
        description: product.description,
        priceLabel: product.priceLabel,
        rank: product.rank,
        durationMinutes: 30,
      },
    });
    if (created.status !== 201) {
      throw new Error(`service ${product.code} failed: ${JSON.stringify(created.json)}`);
    }
    const service = created.json.data;
    const offers = [];
    for (const offer of product.offers) {
      const actionId = linkIds[offer.platform];
      if (!actionId) continue;
      const offerRes = await request(`/api/v1/management/catalog/services/${service.id}/offers`, {
        method: 'POST',
        ...base,
        idempotencyKey: randomUUID(),
        body: {
          externalActionId: actionId,
          offerPrice: offer.offerPrice,
          marketPrice: offer.marketPrice,
          priceSource: '商户经营后台登记 · TEST ONLY',
          sourceUpdatedAt: new Date().toISOString(),
          sortOrder: offers.length + 1,
        },
      });
      if (offerRes.status !== 201) {
        throw new Error(
          `offer ${product.code}/${offer.platform} failed: ${JSON.stringify(offerRes.json)}`,
        );
      }
      offers.push({ ...offer, id: offerRes.json.data.id, externalActionId: actionId });
    }
    services.push({ id: service.id, code: product.code, name: product.name, offers });
  }

  const contents = [];
  for (const story of tenant.pack.stories) {
    const created = await request('/api/v1/management/content', {
      method: 'POST',
      ...base,
      idempotencyKey: randomUUID(),
      body: { kind: 'article', title: story.title, body: story.body, mediaUrl: story.mediaPath },
    });
    if (created.status !== 201) {
      throw new Error(`content create failed: ${JSON.stringify(created.json)}`);
    }
    const contentId = created.json.data.id;
    const approved = await request(`/api/v1/management/content/${contentId}/approve`, {
      method: 'POST',
      ...base,
      body: { version: created.json.data.version },
    });
    if (![200, 201].includes(approved.status)) {
      throw new Error(`content approve failed: ${JSON.stringify(approved.json)}`);
    }
    const placed = await request(`/api/v1/management/content/${contentId}/placements`, {
      method: 'POST',
      ...base,
      body: { storeId: tenant.storeId, rank: 100 + contents.length },
    });
    if (![200, 201].includes(placed.status)) {
      throw new Error(`content place failed: ${JSON.stringify(placed.json)}`);
    }
    contents.push({ id: contentId, title: story.title, mediaPath: story.mediaPath });
  }

  const imagePath = `/fixtures/stores/${storeMeta.imageFile}`;
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const updated = await pool.query(
      `update stores set image_url=$1, updated_at=now()
       where id=$2 and tenant_id=$3 and deleted_at is null returning id`,
      [imagePath, tenant.storeId, tenant.run.tenantId],
    );
    if (!updated.rowCount) throw new Error('store image_url update missed');
  } finally {
    await pool.end();
  }

  const consumer = await request(
    `/api/v1/consumer/stores/${tenant.storeId}?tenant=${encodeURIComponent(tenant.slug)}`,
  );
  if (consumer.status !== 200) {
    throw new Error(`consumer verify failed: ${consumer.status} ${JSON.stringify(consumer.json)}`);
  }
  const publicData = consumer.json.data;
  if (!publicData.services?.length) throw new Error('consumer services empty');
  if (!publicData.platformOffers?.length) throw new Error('consumer platformOffers empty');
  if (!publicData.storefront?.modules?.length) throw new Error('consumer storefront modules empty');

  return {
    tenantId: tenant.run.tenantId,
    slug: tenant.slug,
    industry: tenant.industry,
    label: tenant.pack.label,
    ownerEmail: tenant.email,
    ownerPassword: tenant.password,
    storeId: tenant.storeId,
    storeName: publicData.store?.name,
    imageUrl: imagePath,
    consumerUrl: `${consumerBase}/c/stores/${tenant.storeId}?tenant=${tenant.slug}`,
    oneCode: tenant.run.delivery?.oneCode ?? null,
    services,
    contents,
    platformOfferCount: publicData.platformOffers.length,
    moduleTypes: publicData.storefront.modules.map((item) => item.module_type),
  };
}

async function main() {
  ensureMaterials();
  mkdirSync(outDir, { recursive: true });

  const health = await request('/api/v1/health');
  if (health.status !== 200 || health.json?.status !== 'ok') {
    throw new Error(`API not ready at ${apiBase}: ${JSON.stringify(health)}`);
  }

  const systemToken = await login(systemEmail, systemPassword, systemTenant);
  const selected = INDUSTRIES.slice(0, count);
  const tenants = [];
  for (const [index, industry] of selected.entries()) {
    tenants.push(await enrichTenant(await provisionTenant(systemToken, industry, index)));
  }

  const manifest = {
    recorded_at: new Date().toISOString(),
    result: 'PASS',
    mode: 'LOCAL_TEST_ONLY',
    claim:
      'Not a public commercial claim. Fixtures are TEST ONLY with simulated third-party links and local materials.',
    apiBase,
    consumerBase,
    databaseName: new URL(databaseUrl).pathname.slice(1),
    stamp,
    count: tenants.length,
    tenants,
  };
  const manifestPath = join(outDir, `manifest-${stamp}.json`);
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  writeFileSync(join(outDir, 'latest-manifest.json'), JSON.stringify(manifest, null, 2));
  globalThis.console.log(
    JSON.stringify(
      {
        ok: true,
        manifestPath,
        tenants: tenants.map((item) => ({
          slug: item.slug,
          industry: item.industry,
          consumerUrl: item.consumerUrl,
          services: item.services.length,
          offers: item.platformOfferCount,
        })),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  globalThis.console.error(error);
  process.exitCode = 1;
});
