import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const page = () => readFileSync(join(root, 'apps/management-web/app/m/stores/page.tsx'), 'utf8');
const css = () =>
  readFileSync(join(root, 'apps/management-web/app/m/stores/page.module.css'), 'utf8');

test('W∞-38: management stores has Meituan merchant PC yellow top bar', () => {
  const p = page();
  const c = css();
  assert.match(p, /topBar/);
  assert.match(p, /推广员工具 · 门店入口/);
  assert.match(c, /#ffd100|#ffe14d/);
  assert.match(c, /background:\s*#f5f5f5/);
});

test('W∞-38: management stores gray canvas + white store cards', () => {
  const p = page();
  const c = css();
  assert.match(p, /className=\{styles\.card\}/);
  assert.match(p, /className=\{styles\.panel\}/);
  assert.match(p, /summaryStrip/);
  assert.match(c, /\.card \{/);
  assert.match(c, /\.panel \{/);
});

test('W∞-38: management stores honest entry boundaries preserved', () => {
  const p = page();
  assert.match(p, /不代替平台下单\/支付/);
  assert.match(p, /第三方订单履约/);
  assert.match(p, /团购与第三方平台入口/);
  assert.doesNotMatch(p, /门店管理/);
  assert.doesNotMatch(p, /本平台下单/);
});
