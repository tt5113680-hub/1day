import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const page = () => readFileSync(join(root, 'apps/management-web/app/page.tsx'), 'utf8');
const css = () => readFileSync(join(root, 'apps/management-web/app/page.module.css'), 'utf8');

test('W∞-35: management workbench has Meituan merchant PC yellow top bar', () => {
  const p = page();
  const c = css();
  assert.match(p, /topBar/);
  assert.match(p, /推广员工具 · 管理工作台/);
  assert.match(c, /#ffd100|#ffe14d/);
});

test('W∞-35: management workbench icon function grid + gray canvas', () => {
  const p = page();
  const c = css();
  assert.match(p, /functionIcon/);
  assert.match(p, /SHORTCUT_ICONS/);
  assert.match(c, /grid-template-columns:\s*repeat\(7/);
  assert.match(c, /background:\s*#f5f5f5/);
});

test('W∞-35: management workbench metrics + panels on white cards', () => {
  const p = page();
  const c = css();
  assert.match(p, /今日概况/);
  assert.match(p, /className=\{styles\.metric\}/);
  assert.match(p, /className=\{styles\.panel\}/);
  assert.match(c, /\.panel \{/);
  assert.doesNotMatch(p, /MetricCard/);
});

test('W∞-35: honest tool identity boundaries preserved', () => {
  const p = page();
  assert.match(p, /推广员工具 · 管理工作台/);
  assert.match(p, /不含支付金额/);
  assert.match(p, /近30日服务档案/);
  assert.doesNotMatch(p, /美团商家端 PC · 商家中心/);
  assert.doesNotMatch(p, /对标美团商家端快捷入口/);
});
