import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const dash = () => read('apps/management-web/app/page.tsx');
const dashCss = () => read('apps/management-web/app/page.module.css');

test('G1-W∞-87: /m/dashboard adds Meituan-parity summaryStrip overview bar', () => {
  assert.match(dash(), /data-testid="management-dashboard"/);
  assert.match(dash(), /aria-label="工作台数据概况"/);
  assert.match(dash(), /className=\{styles\.summaryStrip\}/);
  assert.match(dash(), /今日概况/);
});

test('G1-W∞-87: summaryStrip values are real-data derived from dashboard metrics fields', () => {
  assert.match(dash(), /m\.customersToday/);
  assert.match(dash(), /m\.openTasksToday/);
  assert.match(dash(), /m\.completedTasksToday/);
  assert.match(dash(), /m\.overdueTasks/);
  assert.match(dash(), /m\.stores/);
  assert.match(dash(), /m\.activeAssignees/);
});

test('G1-W∞-87: summaryStrip CSS present with responsive stacking', () => {
  assert.match(dashCss(), /\.summaryStrip\s*\{/);
  assert.match(dashCss(), /grid-template-columns:\s*repeat\(6,\s*minmax\(0,\s*1fr\)\);/);
  assert.match(dashCss(), /\.todayItem strong\s*\{/);
  assert.match(
    dashCss(),
    /@media \(max-width: 900px\)[\s\S]*\.summaryStrip\s*\{\s*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/,
  );
});

test('G1-W∞-87: dashboard keeps distribution panels + honest no-native-checkout boundary', () => {
  assert.match(dash(), /aria-label="管理工作台分布"/);
  assert.match(dash(), /管理工作台分布/);
  assert.match(dash(), /推广员工具 · 管理工作台/);
  assert.doesNotMatch(dash(), /AdminPageHeader/);
  assert.doesNotMatch(dash(), /eyebrow=/);
  // honest boundaries retained (source=local, no native checkout / third-party order fulfillment)
  assert.match(dash(), /source=local/);
  assert.match(dash(), /不含支付金额/);
  assert.match(dash(), /非本平台下单/);
});
