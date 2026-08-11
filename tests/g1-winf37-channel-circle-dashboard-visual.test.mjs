import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

test('W∞-37: channel dashboard has Meituan agent PC yellow top bar + icon grid', () => {
  const p = read('apps/platform-web/app/ch/dashboard/page.tsx');
  const c = read('apps/platform-web/app/ch/dashboard/page.module.css');
  assert.match(p, /topBar/);
  assert.match(p, /推广员工具 · 渠道代理/);
  assert.match(p, /functionIcon/);
  assert.match(p, /CHANNEL_SHORTCUTS/);
  assert.match(c, /#ffd100|#ffe14d/);
  assert.match(c, /background:\s*#f5f5f5/);
});

test('W∞-37: circle dashboard has Meituan circle PC yellow top bar + icon grid', () => {
  const p = read('apps/platform-web/app/bc/dashboard/page.tsx');
  const c = read('apps/platform-web/app/bc/dashboard/page.module.css');
  assert.match(p, /topBar/);
  assert.match(p, /推广员工具 · 商圈联盟/);
  assert.match(p, /functionIcon/);
  assert.match(p, /CIRCLE_SHORTCUTS/);
  assert.match(c, /#ffd100|#ffe14d/);
  assert.match(c, /background:\s*#f5f5f5/);
});

test('W∞-37: channel/circle metrics use white panels (no MetricCard)', () => {
  const ch = read('apps/platform-web/app/ch/dashboard/page.tsx');
  const bc = read('apps/platform-web/app/bc/dashboard/page.tsx');
  assert.match(ch, /className=\{styles\.metric\}/);
  assert.match(ch, /className=\{styles\.panel\}/);
  assert.doesNotMatch(ch, /MetricCard/);
  assert.match(bc, /className=\{styles\.metric\}/);
  assert.match(bc, /className=\{styles\.panel\}/);
  assert.doesNotMatch(bc, /MetricCard/);
});

test('W∞-37: honest channel/circle boundaries preserved', () => {
  const ch = read('apps/platform-web/app/ch/dashboard/page.tsx');
  const bc = read('apps/platform-web/app/bc/dashboard/page.tsx');
  assert.match(ch, /不碰钱、不碰销售履约/);
  assert.match(ch, /\/p\/agents/);
  assert.match(ch, /\/ch\/merchants\/new/);
  assert.doesNotMatch(ch, /本平台成交漏斗/);
  assert.match(bc, /已确认入口转化/);
  assert.match(bc, /非本平台下单/);
  assert.match(bc, /<dt>入口转化<\/dt>/);
  assert.doesNotMatch(bc, /已确认订单/);
  assert.doesNotMatch(bc, /<dt>订单<\/dt>/);
});
