import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const page = () =>
  readFileSync(join(root, 'apps/consumer-web/app/c/discovery/discovery.tsx'), 'utf8');
const css = () =>
  readFileSync(join(root, 'apps/consumer-web/app/c/discovery/discovery.module.css'), 'utf8');

test('W∞-32: discovery chrome is Meituan-App sticky locate + search (commercial visual densify)', () => {
  const p = page();
  const c = css();
  assert.match(p, /stickyBar/);
  assert.match(p, /搜索商家 \/ 品类/);
  assert.match(p, /当前位置附近|开启定位/);
  assert.match(c, /position:\s*sticky/);
  assert.match(c, /#ffd100|#ffe14d/);
});

test('W∞-32: discovery uses underline tabs + card list density (not oversized display H1)', () => {
  const p = page();
  const c = css();
  assert.match(p, /className=\{styles\.srOnly\}/);
  assert.match(p, /hidden=\{activeTab !== 'nearby'\}/);
  assert.match(c, /border-bottom-color:\s*#ffd100/);
  assert.match(c, /grid-template-columns:\s*72px/);
  assert.doesNotMatch(p, /font-size:\s*30px/);
});

test('W∞-32: honest commercial boundaries preserved on discovery', () => {
  const p = page();
  assert.match(p, /推广员工具/);
  assert.match(p, /全平台可见引流/);
  assert.match(p, /不在此下单/);
  assert.match(p, /本地试用提示/);
  assert.match(p, /\/c\/circles\?tenant=/);
  assert.match(p, /非本平台下单/);
});
