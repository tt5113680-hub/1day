/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const tenant = '00000000-0000-4000-8000-000000000001';
const base = 'http://127.0.0.1:3025';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '3025', DATABASE_URL: db, AUTH_TOKEN_SECRET: 'core-008-e2e' },
  stdio: 'ignore',
});
const h = (token, key) => ({
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
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error('API not ready');
}
test.after(() => api.kill());
test('templates support draft preview, publish and rollback with tenant controls', async () => {
  await ready();
  const login = await request('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@system.local',
      password: 'ChangeMe123!',
      tenantId: tenant,
    }),
  });
  const token = (await login.json()).accessToken,
    stamp = Date.now();
  const create = await request('/api/v1/page-templates', {
    method: 'POST',
    headers: h(token, `template-${stamp}`),
    body: JSON.stringify({
      code: `landing-${stamp}`,
      name: 'Summer landing page',
      target: 'consumer',
      modules: [
        { moduleType: 'hero', config: { title: 'Welcome' } },
        { moduleType: 'action_grid', config: { actions: 2 } },
      ],
    }),
  });
  assert.equal(create.status, 201);
  const template = (await create.json()).data;
  const initial = await request(`/api/v1/page-templates/${template.id}/preview`, {
    headers: h(token),
  });
  const first = (await initial.json()).data;
  assert.equal(first.version.status, 'draft');
  assert.equal(first.modules.length, 2);
  const publishOne = await request(`/api/v1/page-templates/${template.id}/publish`, {
    method: 'POST',
    headers: h(token),
    body: JSON.stringify({ versionId: template.draftVersionId, templateVersion: template.version }),
  });
  assert.equal(publishOne.status, 201);
  const firstPublish = (await publishOne.json()).data;
  const draft = await request(`/api/v1/page-templates/${template.id}/drafts`, {
    method: 'POST',
    headers: h(token),
    body: JSON.stringify({ sourceVersionId: template.draftVersionId }),
  });
  assert.equal(draft.status, 201);
  const second = (await draft.json()).data;
  const publishTwo = await request(`/api/v1/page-templates/${template.id}/publish`, {
    method: 'POST',
    headers: h(token),
    body: JSON.stringify({ versionId: second.id, templateVersion: firstPublish.version }),
  });
  assert.equal(publishTwo.status, 201);
  const secondPublish = (await publishTwo.json()).data;
  const rollback = await request(`/api/v1/page-templates/${template.id}/rollback`, {
    method: 'POST',
    headers: h(token),
    body: JSON.stringify({
      versionId: template.draftVersionId,
      templateVersion: secondPublish.version,
    }),
  });
  assert.equal(rollback.status, 201);
  const finalPreview = await request(`/api/v1/page-templates/${template.id}/preview`, {
    headers: h(token),
  });
  assert.equal((await finalPreview.json()).data.version.id, template.draftVersionId);
  assert.equal(
    (await request('/api/v1/page-templates', { headers: { 'x-request-id': randomUUID() } })).status,
    401,
  );
  assert.equal(
    (
      await request('/api/v1/page-templates', {
        headers: { ...h(token), 'x-tenant-context': '00000000-0000-4000-8000-000000000099' },
      })
    ).status,
    403,
  );
});
