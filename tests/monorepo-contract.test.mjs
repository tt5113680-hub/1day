import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const expectedApps = [
  'consumer-web',
  'employee-web',
  'management-web',
  'platform-web',
  'api',
  'worker',
];
const expectedPackages = [
  'ui',
  'design-tokens',
  'contracts',
  'database',
  'auth',
  'events',
  'workflows',
  'ai-core',
  'observability',
  'testing',
  'config',
];

test('workspace declares pnpm 10 and Node.js 24', () => {
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  assert.match(manifest.packageManager, /^pnpm@10\./);
  assert.match(manifest.engines.node, /^>=24\./);
});

test('workspace lists app and package globs', () => {
  const workspace = readFileSync(join(root, 'pnpm-workspace.yaml'), 'utf8');
  assert.match(workspace, /- apps\/\*/);
  assert.match(workspace, /- packages\/\*/);
});

for (const name of expectedApps) {
  test(`app workspace exists: ${name}`, () => {
    assert.ok(existsSync(join(root, 'apps', name, 'package.json')));
  });
}

for (const name of expectedPackages) {
  test(`shared package exists: ${name}`, () => {
    assert.ok(existsSync(join(root, 'packages', name, 'package.json')));
  });
}

test('Turbo pipeline defines build, typecheck, and test', () => {
  const turbo = JSON.parse(readFileSync(join(root, 'turbo.json'), 'utf8'));
  assert.deepEqual(Object.keys(turbo.tasks).sort(), ['build', 'test', 'typecheck']);
});
