import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const page = () =>
  readFileSync(join(root, 'apps/employee-web/app/e/tasks/[id]/task-detail.tsx'), 'utf8');
const css = () =>
  readFileSync(join(root, 'apps/employee-web/app/e/tasks/[id]/task-detail.module.css'), 'utf8');

test('W∞-92: employee task detail has Meituan sticky yellow top bar + gray canvas', () => {
  const p = page();
  const c = css();
  assert.match(p, /topBar/);
  assert.match(p, /推广员工具 · 任务详情/);
  assert.match(c, /#ffd100|#ffe14d/);
  assert.match(c, /background:\s*#f5f5f5/);
});

test('W∞-92: employee task detail adds summaryStrip + real-data distribution panel', () => {
  const p = page();
  const c = css();
  assert.match(p, /aria-label="任务详情概况"/);
  assert.match(p, /aria-label="任务详情分布"/);
  assert.match(p, /证据类型分布/);
  assert.match(p, /证据媒介分布/);
  assert.match(p, /证据来源分布/);
  assert.match(p, /升级状态分布/);
  assert.match(p, /barWidth\(/);
  assert.match(p, /countBy\(/);
  assert.match(p, /summaryStrip/);
  assert.match(c, /\.summaryStrip/);
  assert.match(c, /\.distribution/);
  assert.match(c, /\.barFill/);
});

test('W∞-92: distributions derive from real task detail rows (禁止假 BI)', () => {
  const p = page();
  assert.match(p, /data\.evidence/);
  assert.match(p, /data\.availableEvidence/);
  assert.match(p, /data\.task\.escalationLevel/);
  assert.match(p, /evidence_type/);
  assert.match(p, /media_type/);
  assert.doesNotMatch(p, /假 BI|mockMetrics|authMetrics|Math\.random\(/);
});

test('W∞-92: honest employee task-detail boundaries preserved', () => {
  const p = page();
  assert.match(p, /source=local/);
  assert.match(p, /不含第三方订单履约/);
  assert.match(p, /不代履约美团\/抖音订单/);
  assert.match(p, /非本平台下单/);
  assert.doesNotMatch(p, /经营概览/);
  assert.doesNotMatch(p, /本平台收款/);
});

test('W∞-92: all existing task-detail interactions preserved', () => {
  const p = page();
  assert.match(p, /evidence-links/);
  assert.match(p, /linkEvidence/);
  assert.match(p, /recordResult|保存结果与证据/);
  assert.match(p, /follow-up/);
  assert.match(p, /正在加载任务详情/);
  assert.match(p, /无法查看此任务/);
  assert.match(p, /任务详情暂不可用/);
});
