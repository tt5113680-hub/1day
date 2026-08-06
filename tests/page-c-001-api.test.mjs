/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const tenant = '00000000-0000-4000-8000-000000000001';
const base = 'http://127.0.0.1:3028';
const requireFromApi = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { Client } = requireFromApi('pg');
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3028', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'page-c-001-api' },
  stdio: 'ignore',
});
const headers = (token, key) => ({
  authorization: `Bearer ${token}`,
  'content-type': 'application/json',
  'x-request-id': randomUUID(),
  ...(key ? { 'idempotency-key': key } : {}),
});
const request = (path, options) => fetch(base + path, options);
async function ready() {
  for (let i = 0; i < 30; i += 1) {
    try {
      if ((await request('/api/v1/health')).ok) return;
    } catch {
      /* starting */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw Error('API not ready');
}
async function login() {
  const response = await request('/api/v1/auth/login', {
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
test('public consumer entry exposes only published tenant content and configured actions', async () => {
  await ready();
  const token = await login(),
    stamp = Date.now();
  const templateResponse = await request('/api/v1/page-templates', {
    method: 'POST',
    headers: headers(token, `entry-template-${stamp}`),
    body: JSON.stringify({
      code: `entry-${stamp}`,
      name: 'Consumer entry',
      target: 'consumer',
      modules: [
        {
          moduleType: 'hero',
          config: {
            sceneLabel: '来自周末场景',
            title: '给今天一点新灵感',
            summary: '为你挑选的到店体验。',
            benefit: '新客专享权益',
          },
        },
        {
          moduleType: 'action_grid',
          config: { recommendations: [{ title: '轻松预约', description: '提前锁定可用时间' }] },
        },
        {
          moduleType: 'content',
          config: { cards: [{ tag: '新客礼', title: '双人体验券', description: '到店即可使用' }] },
        },
      ],
    }),
  });
  assert.equal(templateResponse.status, 201);
  const template = (await templateResponse.json()).data;
  assert.equal(
    (
      await request(`/api/v1/page-templates/${template.id}/publish`, {
        method: 'POST',
        headers: headers(token),
        body: JSON.stringify({
          versionId: template.draftVersionId,
          templateVersion: template.version,
        }),
      })
    ).status,
    201,
  );
  assert.equal(
    (
      await request('/api/v1/external-actions', {
        method: 'POST',
        headers: headers(token, `entry-action-${stamp}`),
        body: JSON.stringify({
          code: `consult-${stamp}`,
          name: '咨询商家',
          actionType: 'link',
          targetUrl: 'https://example.com/consult',
          platform: 'web',
        }),
      })
    ).status,
    201,
  );
  const client = new Client({ connectionString: db });
  await client.connect();
  try {
    await client.query(
      "insert into tenants(id,slug,name,status,created_by,updated_by) values($1,$2,$3,'active',null,null)",
      [randomUUID(), `isolated-${stamp}`, 'Isolated tenant'],
    );
  } finally {
    await client.end();
  }
  const entry = await request('/api/v1/consumer/entry?tenant=system');
  assert.equal(entry.status, 200);
  const data = (await entry.json()).data;
  assert.equal(data.tenant.name, 'ONEDAY System');
  assert.equal(data.template.code, template.code);
  assert.equal(data.modules.length, 3);
  assert.equal(
    data.actions.some((item) => item.name === '咨询商家'),
    true,
  );
  assert.equal(JSON.stringify(data).includes('password_hash'), false);
  const isolated = await request(`/api/v1/consumer/entry?tenant=isolated-${stamp}`);
  assert.equal(isolated.status, 200);
  assert.equal((await isolated.json()).data.actions.length, 0);
  assert.equal((await request('/api/v1/consumer/entry?tenant=missing-entry')).status, 404);
  assert.equal((await request('/api/v1/consumer/entry?tenant=INVALID')).status, 400);
});
