/* global clearTimeout, setTimeout */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import test from 'node:test';

function startApi(environment) {
  return spawn(process.execPath, ['apps/api/dist/main.js'], {
    cwd: process.cwd(),
    env: environment,
    stdio: ['ignore', 'ignore', 'pipe'],
  });
}

test('production API startup fails closed when AUTH_TOKEN_SECRET is missing', async () => {
  const environment = {
    ...process.env,
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://invalid',
  };
  delete environment.AUTH_TOKEN_SECRET;
  const api = startApi(environment);
  let stderr = '';
  api.stderr.on('data', (chunk) => {
    stderr += chunk;
  });
  const exitCode = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      api.kill();
      reject(new Error('API did not fail closed without AUTH_TOKEN_SECRET'));
    }, 3000);
    api.once('exit', (code) => {
      clearTimeout(timeout);
      resolve(code);
    });
  });
  assert.notEqual(exitCode, 0);
  assert.match(stderr, /AUTH_TOKEN_SECRET is required/);
});

test('runtime configuration rejects the retired development secret', async () => {
  const environment = {
    ...process.env,
    NODE_ENV: 'production',
    AUTH_TOKEN_SECRET: 'development-only-change-me',
    DATABASE_URL: 'postgresql://invalid',
  };
  const api = startApi(environment);
  let stderr = '';
  api.stderr.on('data', (chunk) => {
    stderr += chunk;
  });
  const exitCode = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      api.kill();
      reject(new Error('API did not reject the retired development secret'));
    }, 3000);
    api.once('exit', (code) => {
      clearTimeout(timeout);
      resolve(code);
    });
  });
  assert.notEqual(exitCode, 0);
  assert.match(stderr, /retired development default secret/);
});
