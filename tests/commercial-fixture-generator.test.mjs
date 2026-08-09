/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const base = 'http://127.0.0.1:3261';
const systemTenant = '00000000-0000-4000-8000-000000000001';
const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const outDir = join(process.cwd(), 'evidence/COMMERCIAL-FIXTURES/test-runs');

const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3261',
    DATABASE_URL: databaseUrl,
    AUTH_TOKEN_SECRET: 'commercial-fixture-generator',
  },
  stdio: 'ignore',
});

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function ready() {
  for (let i = 0; i < 60; i += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      // starting
    }
    await wait(100);
  }
  throw new Error('API did not start');
}

test.after(() => api.kill());

test('commercial fixture generator provisions 1-3 READY tenants with products and materials', async () => {
  await ready();
  const generator = spawn(
    process.execPath,
    [
      'scripts/generate-commercial-fixtures.mjs',
      '--count=2',
      `--api=${base}`,
      `--consumer=${base}`,
      `--databaseUrl=${databaseUrl}`,
      '--systemEmail=admin@system.local',
      '--systemPassword=ChangeMe123!',
      `--systemTenant=${systemTenant}`,
      `--stamp=${stamp}`,
      '--prefix=cfix',
      `--out=${outDir}`,
    ],
    { cwd: process.cwd(), env: { ...process.env, DATABASE_URL: databaseUrl }, stdio: 'pipe' },
  );
  let stdout = '';
  let stderr = '';
  generator.stdout.on('data', (chunk) => {
    stdout += chunk;
  });
  generator.stderr.on('data', (chunk) => {
    stderr += chunk;
  });
  const code = await new Promise((resolve) => generator.on('close', resolve));
  assert.equal(code, 0, stderr || stdout);
  const latest = join(outDir, 'latest-manifest.json');
  assert.ok(existsSync(latest), 'latest-manifest.json missing');
  const manifest = JSON.parse(readFileSync(latest, 'utf8'));
  assert.equal(manifest.result, 'PASS');
  assert.equal(manifest.count, 2);
  assert.equal(manifest.tenants.length, 2);
  for (const tenant of manifest.tenants) {
    assert.ok(tenant.services.length >= 2, `${tenant.slug} needs products`);
    assert.ok(tenant.platformOfferCount >= 2, `${tenant.slug} needs offers`);
    assert.ok(tenant.contents.length >= 1, `${tenant.slug} needs content`);
    assert.ok(tenant.imageUrl.startsWith('/fixtures/stores/'));
    const consumer = await fetch(
      `${base}/api/v1/consumer/stores/${tenant.storeId}?tenant=${encodeURIComponent(tenant.slug)}`,
    );
    assert.equal(consumer.status, 200);
    const body = await consumer.json();
    assert.ok(body.data.platformOffers.length >= 2);
    assert.ok(body.data.storefront?.modules?.length >= 1);
  }
  assert.ok(existsSync(join(process.cwd(), 'apps/consumer-web/public/fixtures/stores/restaurant-a.png')));
  assert.ok(
    existsSync(join(process.cwd(), 'apps/consumer-web/public/fixtures/materials/restaurant-story-a.png')),
  );
});
