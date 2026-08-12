import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const page = () =>
  readFileSync(join(root, 'apps/employee-web/app/e/tasks/task-inbox.tsx'), 'utf8');
const css = () =>
  readFileSync(join(root, 'apps/employee-web/app/e/tasks/task-inbox.module.css'), 'utf8');

test('W∞-64: employee task inbox has Meituan merchant sticky yellow top bar', () => {
  const p = page();
  const c = css();
  assert.match(p, /topBar/);
  assert.match(p, /推广员工具 · 任务收件箱/);
  assert.match(c, /#ffd100|#ffe14d/);
  assert.match(c, /background:\s*#f5f5f5/);
});

test('W∞-64: employee task inbox adds real-data distribution panel', () => {
  const p = page();
  const c = css();
  assert.match(p, /aria-label="任务待办分布"/);
  assert.match(p, /状态分布/);
  assert.match(p, /升级分布/);
  assert.match(p, /客户关联分布/);
  assert.match(p, /到期窗口分布/);
  assert.match(p, /来源分布/);
  assert.match(p, /barWidth\(/);
  assert.match(p, /countBy\(/);
  assert.match(p, /summaryStrip/);
  assert.match(c, /\.distribution/);
  assert.match(c, /\.barFill/);
});

test('W∞-64: employee task inbox distributions derive from tasks + customerReminders rows', () => {
  const p = page();
  assert.match(p, /openTasks/);
  assert.match(p, /customerReminders/);
  assert.match(p, /allRows/);
  assert.match(p, /escalationBucket/);
  assert.match(p, /dueBucket/);
  assert.doesNotMatch(p, /假 BI|mockMetrics|Math\.random\(/);
});

test('W∞-64: honest employee task boundaries preserved', () => {
  const p = page();
  assert.match(p, /不含第三方订单履约/);
  assert.match(p, /不代履约美团\/抖音订单/);
  assert.match(p, /非本平台下单/);
  assert.match(p, /source=local/);
  assert.doesNotMatch(p, /经营概览/);
  assert.doesNotMatch(p, /本平台收款/);
});
