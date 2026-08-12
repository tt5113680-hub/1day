import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const page = () =>
  readFileSync(join(root, 'apps/employee-web/app/e/customers/[id]/customer-detail.tsx'), 'utf8');
const css = () =>
  readFileSync(join(root, 'apps/employee-web/app/e/tasks/[id]/task-detail.module.css'), 'utf8');

test('W∞-93: employee customer detail has Meituan sticky yellow top bar + gray canvas', () => {
  const p = page();
  const c = css();
  assert.match(p, /styles\.topBar/);
  assert.match(p, /推广员工具 · 客户详情/);
  assert.match(p, /styles\.topBarRefresh/);
  assert.match(p, /data-testid="employee-customer-detail"/);
  assert.match(c, /#ffd100|#ffe14d/);
  assert.match(c, /background:\s*#f5f5f5/);
});

test('W∞-93: employee customer detail adds summaryStrip + real-data distribution panel', () => {
  const p = page();
  const c = css();
  assert.match(p, /aria-label="客户详情概况"/);
  assert.match(p, /aria-label="客户详情分布"/);
  assert.match(p, /来源类型分布/);
  assert.match(p, /归属角色分布/);
  assert.match(p, /相关任务状态分布/);
  assert.match(p, /时间线动态分布/);
  assert.match(p, /barWidth\(/);
  assert.match(p, /countBy\(/);
  assert.match(p, /summaryStrip/);
  assert.match(c, /\.summaryStrip/);
  assert.match(c, /\.distribution/);
  assert.match(c, /\.barFill/);
});

test('W∞-93: distributions derive from real customer detail rows (禁止假 BI)', () => {
  const p = page();
  assert.match(p, /data\.sources/);
  assert.match(p, /data\.ownerships/);
  assert.match(p, /data\.tasks/);
  assert.match(p, /data\.timeline/);
  assert.match(p, /source_role/);
  assert.match(p, /ownershipRole/);
  assert.match(p, /\.status/);
  assert.doesNotMatch(p, /假 BI|mockMetrics|authMetrics|Math\.random\(/);
});

test('W∞-93: honest employee customer-detail boundaries preserved', () => {
  const p = page();
  assert.match(p, /source=local/);
  assert.match(p, /非本平台下单/);
  assert.match(p, /不含第三方订单履约/);
  assert.match(p, /仅记录客户跟进入口痕迹/);
  assert.doesNotMatch(p, /经营概览/);
  assert.doesNotMatch(p, /本平台收款/);
});

test('W∞-93: all existing customer-detail states and interactions preserved', () => {
  const p = page();
  assert.match(p, /正在加载客户详情/);
  assert.match(p, /无法查看此客户/);
  assert.match(p, /客户详情暂不可用/);
  assert.match(p, /\$\{businessLabel\(item\.type\)\}/);
  assert.match(p, /\$\{item\.label\}/);
  assert.match(p, /查看/);
  assert.match(p, /返回工作台/);
});
