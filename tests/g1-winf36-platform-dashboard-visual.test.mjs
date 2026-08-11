import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const page = () => readFileSync(join(root, 'apps/platform-web/app/p/dashboard/page.tsx'), 'utf8');
const css = () =>
  readFileSync(join(root, 'apps/platform-web/app/p/dashboard/page.module.css'), 'utf8');

test('W∞-36: platform dashboard has Meituan platform PC yellow top bar', () => {
  const p = page();
  const c = css();
  assert.match(p, /topBar/);
  assert.match(p, /推广员工具 · 平台总览/);
  assert.match(c, /#ffd100|#ffe14d/);
});

test('W∞-36: platform dashboard icon function grid + gray canvas', () => {
  const p = page();
  const c = css();
  assert.match(p, /functionIcon/);
  assert.match(p, /PLATFORM_SHORTCUTS/);
  assert.match(c, /background:\s*#f5f5f5/);
});

test('W∞-36: platform dashboard metrics + panels on white cards', () => {
  const p = page();
  const c = css();
  assert.match(p, /className=\{styles\.metric\}/);
  assert.match(p, /className=\{styles\.panel\}/);
  assert.match(c, /\.panel \{/);
  assert.doesNotMatch(p, /MetricCard/);
});

test('W∞-36: honest tool identity boundaries preserved', () => {
  const p = page();
  assert.match(p, /推广员工具 · 平台总览/);
  assert.match(p, /不含本平台收款/);
  assert.doesNotMatch(p, /美团平台/);
});
