import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import test from 'node:test';
import { signAccessToken } from '../packages/auth/dist/index.js';

const base = 'http://127.0.0.1:3015';
const env = {
  ...process.env,
  PORT: '3015',
  DATABASE_URL: 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test',
  AUTH_TOKEN_SECRET: 'foundation-005-e2e-secret',
};
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  cwd: process.cwd(),
  env,
  stdio: 'ignore',
});

async function request(path, options) {
  return fetch(`${base}${path}`, options);
}
async function ready() {
  for (let i = 0; i < 30; i += 1) {
    try {
      if ((await request('/api/v1/health')).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('API did not become ready');
}

test.after(() => api.kill());
test('login, refresh rotation, logout and revoked-token rejection use persistent sessions', async () => {
  await ready();
  const login = await request('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@system.local',
      password: 'ChangeMe123!',
      tenantId: '00000000-0000-4000-8000-000000000001',
      deviceName: 'e2e',
    }),
  });
  assert.equal(login.status, 201);
  const tokens = await login.json();
  assert.ok(tokens.accessToken);
  assert.ok(tokens.refreshToken);
  const refreshed = await request('/api/v1/auth/refresh', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken: tokens.refreshToken }),
  });
  assert.equal(refreshed.status, 201);
  const next = await refreshed.json();
  assert.equal(
    (
      await request('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await request('/api/v1/auth/logout', {
        method: 'POST',
        headers: { authorization: `Bearer ${next.accessToken}` },
      })
    ).status,
    201,
  );
  assert.equal(
    (
      await request('/api/v1/auth/logout', {
        method: 'POST',
        headers: { authorization: `Bearer ${next.accessToken}` },
      })
    ).status,
    401,
  );
});

test('tampered and cross-tenant session revocation attempts are rejected', async () => {
  await ready();
  const login = await request('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@system.local',
      password: 'ChangeMe123!',
      tenantId: '00000000-0000-4000-8000-000000000001',
    }),
  });
  const tokens = await login.json();
  assert.equal(
    (
      await request('/api/v1/auth/logout', {
        method: 'POST',
        headers: { authorization: `Bearer ${tokens.accessToken}x` },
      })
    ).status,
    401,
  );
  const parts = tokens.accessToken.split('.');
  const claims = JSON.parse(Buffer.from(parts[0], 'base64url'));
  const foreign = signAccessToken(
    { ...claims, tenantId: '00000000-0000-4000-8000-000000000099' },
    'foundation-005-e2e-secret',
  );
  assert.equal(
    (
      await request('/api/v1/auth/logout', {
        method: 'POST',
        headers: { authorization: `Bearer ${foreign}` },
      })
    ).status,
    401,
  );
});
