/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import {
  MANAGEMENT_MENU_CATALOG,
  filterMenuCatalog,
} from '../packages/contracts/dist/index.js';

const apiBase = 'http://127.0.0.1:3327';
const tenant = '00000000-0000-4000-8000-000000000001';
const db = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3327',
    DATABASE_URL: db,
    AUTH_TOKEN_SECRET: 'sys-25-external-actions',
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

test.after(() => api.kill());

test('SYS-25 menu surfaces external-actions and API create/list works', async () => {
  assert.ok(MANAGEMENT_MENU_CATALOG.some((item) => item.key === 'external-actions'));
  assert.ok(
    filterMenuCatalog(MANAGEMENT_MENU_CATALOG, ['tenant.manage']).some(
      (item) => item.href === '/m/external-actions',
    ),
  );

  await ready();
  const login = await fetch(`${apiBase}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@system.local',
      password: 'ChangeMe123!',
      tenantId: tenant,
    }),
  });
  assert.equal(login.status, 201);
  const token = (await login.json()).accessToken;
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const code = `sys25-${stamp}`.slice(0, 32);
  const created = await fetch(`${apiBase}/api/v1/external-actions`, {
    method: 'POST',
    headers: headers(token, `sys25-${stamp}`),
    body: JSON.stringify({
      code,
      name: `SYS25 Link ${stamp}`,
      actionType: 'link',
      targetUrl: 'https://example.test/sys25',
      platform: 'external',
    }),
  });
  const createdPayload = await created.json();
  assert.equal(created.status, 201, JSON.stringify(createdPayload));
  assert.equal(createdPayload.data.code, code);

  const listed = await fetch(`${apiBase}/api/v1/external-actions`, {
    headers: headers(token),
  });
  assert.equal(listed.status, 200);
  const rows = (await listed.json()).data;
  assert.ok(rows.some((row) => row.code === code && row.target_url === 'https://example.test/sys25'));
});
