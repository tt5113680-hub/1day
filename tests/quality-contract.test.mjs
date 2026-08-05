import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

test('quality tooling and commit convention are configured', () => {
  const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
  for (const script of ['lint', 'format:check', 'commitlint']) assert.ok(manifest.scripts[script]);
  for (const file of ['eslint.config.mjs', 'prettier.config.mjs', 'commitlint.config.mjs'])
    assert.ok(existsSync(file));
});
