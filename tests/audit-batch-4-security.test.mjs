/* global clearTimeout, fetch, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import test from 'node:test';

const databaseUrl = 'postgresql://oneday:oneday_local_only@localhost:5434/oneday_v3_test';
const authSecret = 'audit-batch-4-production-secret-with-32-characters';
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function startApi(port, environment = {}, stdio = 'ignore') {
  return spawn(process.execPath, ['apps/api/dist/main.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      DATABASE_URL: databaseUrl,
      AUTH_TOKEN_SECRET: authSecret,
      ...environment,
    },
    stdio,
  });
}

async function ready(base) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      if ((await fetch(`${base}/api/v1/health`)).ok) return;
    } catch {
      // API is starting.
    }
    await wait(100);
  }
  throw new Error(`API did not become ready at ${base}`);
}

async function exitsWith(environment, expectedMessage) {
  const api = startApi(3167, environment, ['ignore', 'ignore', 'pipe']);
  let stderr = '';
  api.stderr.on('data', (chunk) => {
    stderr += chunk;
  });
  const code = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      api.kill();
      reject(new Error(`API did not fail closed: ${expectedMessage}`));
    }, 3000);
    api.once('exit', (exitCode) => {
      clearTimeout(timeout);
      resolve(exitCode);
    });
  });
  assert.notEqual(code, 0);
  assert.match(stderr, expectedMessage);
}

test('AUDIT-BATCH-4 enforces CORS, request correlation, database limits and production transport safety', async () => {
  const base = 'http://127.0.0.1:3166';
  const api = startApi(3166, {
    NODE_ENV: 'test',
    CORS_ORIGINS: 'https://consumer.example.test',
    RATE_LIMIT_ENABLED: 'true',
    RATE_LIMIT_NAMESPACE: `audit-batch-4-${process.pid}`,
    RATE_LIMIT_WINDOW_MS: '60000',
    RATE_LIMIT_AUTH_MAX: '2',
    RATE_LIMIT_PUBLIC_WRITE_MAX: '1',
  });
  try {
    await ready(base);
    const health = await fetch(`${base}/api/v1/health`, {
      headers: { 'x-request-id': 'audit-batch-4-health' },
    });
    assert.equal(health.status, 200);
    assert.equal(health.headers.get('x-request-id'), 'audit-batch-4-health');

    const preflight = await fetch(`${base}/api/v1/auth/sessions/example`, {
      method: 'OPTIONS',
      headers: {
        origin: 'https://consumer.example.test',
        'access-control-request-method': 'DELETE',
        'access-control-request-headers': 'authorization,x-request-id',
      },
    });
    assert.equal(preflight.status, 204);
    assert.equal(
      preflight.headers.get('access-control-allow-origin'),
      'https://consumer.example.test',
    );
    assert.match(preflight.headers.get('access-control-allow-methods') ?? '', /DELETE/);
    assert.equal(
      preflight.headers.get('access-control-allow-headers')?.includes('authorization'),
      true,
    );

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await fetch(`${base}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      assert.equal(response.status, 400);
    }
    assert.equal(
      (
        await fetch(`${base}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({}),
        })
      ).status,
      429,
    );

    const publicWrite = `${base}/api/v1/consumer/actions/not-a-real-action/confirm`;
    assert.notEqual((await fetch(publicWrite, { method: 'POST' })).status, 429);
    assert.equal((await fetch(publicWrite, { method: 'POST' })).status, 429);

    await exitsWith(
      {
        NODE_ENV: 'production',
        PUBLIC_BASE_URL: 'https://api.example.test',
        TLS_TERMINATED_BY_PROXY: 'true',
        TRUST_PROXY: 'true',
        RATE_LIMIT_TRUSTED_EDGE: 'true',
      },
      /CORS_ORIGINS is required/,
    );
    await exitsWith(
      {
        NODE_ENV: 'production',
        CORS_ORIGINS: 'https://consumer.example.test',
        PUBLIC_BASE_URL: 'http://api.example.test',
        TLS_TERMINATED_BY_PROXY: 'true',
        TRUST_PROXY: 'true',
        RATE_LIMIT_TRUSTED_EDGE: 'true',
      },
      /PUBLIC_BASE_URL must be an HTTPS URL/,
    );

    const production = startApi(3168, {
      NODE_ENV: 'production',
      CORS_ORIGINS: 'https://consumer.example.test',
      PUBLIC_BASE_URL: 'https://api.example.test',
      TLS_TERMINATED_BY_PROXY: 'true',
      TRUST_PROXY: 'true',
      RATE_LIMIT_TRUSTED_EDGE: 'true',
      RATE_LIMIT_NAMESPACE: `audit-batch-4-production-${process.pid}`,
    });
    try {
      await ready('http://127.0.0.1:3168');
    } finally {
      production.kill();
    }
  } finally {
    api.kill();
  }
});
