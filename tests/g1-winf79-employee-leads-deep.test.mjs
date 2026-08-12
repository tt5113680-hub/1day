import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const page = () => readFileSync(join(root, 'apps/employee-web/app/e/leads/lead-pool.tsx'), 'utf8');
const css = () =>
  readFileSync(join(root, 'apps/employee-web/app/e/leads/lead-pool.module.css'), 'utf8');

test('W∞-79: employee lead pool has Meituan merchant sticky yellow top bar', () => {
  const p = page();
  const c = css();
  assert.match(p, /topBar/);
  assert.match(p, /推广员工具 · 获客池/);
  assert.match(c, /#ffd100|#ffe14d/);
  assert.match(c, /background:\s*#f5f5f5/);
});

test('W∞-79: employee lead pool adds real-data distribution panel', () => {
  const p = page();
  const c = css();
  assert.match(p, /aria-label="获客池分布"/);
  assert.match(p, /状态分布/);
  assert.match(p, /优先级分布/);
  assert.match(p, /来源分布/);
  assert.match(p, /待办负载分布/);
  assert.match(p, /归属分布/);
  assert.match(p, /summaryStrip/);
  assert.match(p, /barWidth\(/);
  assert.match(p, /countBy\(/);
  assert.match(c, /\.distribution/);
  assert.match(c, /\.barFill/);
});

test('W∞-79: employee lead pool distributions derive from leads rows', () => {
  const p = page();
  assert.match(p, /statusDist/);
  assert.match(p, /priorityDist/);
  assert.match(p, /sourceDist/);
  assert.match(p, /taskLoadDist/);
  assert.match(p, /ownershipDist/);
  assert.match(p, /businessLabel\(lead\.sourceType\)/);
  assert.doesNotMatch(p, /假 BI|mockMetrics|Math\.random\(/);
});

test('W∞-79: honest employee lead pool boundaries preserved', () => {
  const p = page();
  assert.match(p, /不含支付金额/);
  assert.match(p, /非本平台下单/);
  assert.match(p, /source=local/);
  assert.match(p, /第三方订单结果/);
  assert.doesNotMatch(p, /import \{[^}]*\bCard\b/);
});
