import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

test('G1-W∞-98: platform agents page removes page-level Card chrome', () => {
  const page = read('apps/platform-web/app/p/agents/page.tsx');
  assert.doesNotMatch(page, /import \{[^}]*\bCard\b/);
  assert.doesNotMatch(page, /<Card\b/);
  assert.match(page, /<section className=\{styles\.panel\}>/);
  assert.match(page, /<section className=\{styles\.tree\}>/);
});

test('G1-W∞-98: Meituan yellow design token contract matches foundation.css', () => {
  const css = read('packages/design-tokens/foundation.css');
  assert.match(css, /--od-brand-50: #fffbea;/);
  assert.match(css, /--od-brand-800: #c49200;/);
  assert.match(css, /--od-brand-700: #ffd100;/);
});
