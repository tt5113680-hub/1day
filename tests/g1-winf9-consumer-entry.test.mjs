import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('G1-W∞-9: consumer entry densify', () => {
  const root = process.cwd();
  const page = readFileSync(
    join(root, 'apps/consumer-web/app/c/entry/consumer-entry.tsx'),
    'utf8',
  );
  assert.match(page, /推广员入口/);
  assert.match(page, /\/c\/circles\?tenant=/);
  assert.match(page, /经确认页跳转/);
  assert.match(page, /只统计至出站/);
  assert.match(page, /saabei/);
});
