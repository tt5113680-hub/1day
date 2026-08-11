import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const page = () => readFileSync(join(root, 'apps/employee-web/app/e/workbench/workbench.tsx'), 'utf8');
const css = () =>
  readFileSync(join(root, 'apps/employee-web/app/e/workbench/workbench.module.css'), 'utf8');

test('W∞-34: employee workbench has Meituan merchant sticky yellow top bar', () => {
  const p = page();
  const c = css();
  assert.match(p, /topBar/);
  assert.match(p, /推广员工具 · 工作台/);
  assert.match(c, /position:\s*sticky/);
  assert.match(c, /#ffd100|#ffe14d/);
});

test('W∞-34: employee workbench hero + icon function grid (merchant app density)', () => {
  const p = page();
  const c = css();
  assert.match(p, /heroCard/);
  assert.match(p, /functionIcon/);
  assert.match(p, /FUNCTION_ICONS/);
  assert.match(c, /grid-template-columns:\s*repeat\(3/);
  assert.match(c, /background:\s*#f5f5f5/);
});

test('W∞-34: employee workbench metrics + task panels on white cards', () => {
  const p = page();
  const c = css();
  assert.match(p, /今日作业概览/);
  assert.match(p, /className=\{styles\.metric\}/);
  assert.match(p, /className=\{styles\.panel\}/);
  assert.match(c, /\.panel \{/);
});

test('W∞-34: honest tool identity boundaries preserved', () => {
  const p = page();
  assert.match(p, /推广员工具 · 工作台/);
  assert.match(p, /不含第三方订单履约/);
  assert.doesNotMatch(p, /美团商家/);
  assert.doesNotMatch(p, /经营概览/);
});
