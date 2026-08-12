import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const page = () =>
  readFileSync(join(root, 'apps/employee-web/app/e/tasks/[id]/follow-up/follow-up.tsx'), 'utf8');
const taskCss = () =>
  readFileSync(join(root, 'apps/employee-web/app/e/tasks/[id]/task-detail.module.css'), 'utf8');

test('W∞-94: employee follow-up converges to shared yellow topBar (no orphan .header ref)', () => {
  const p = page();
  const c = taskCss();
  assert.match(p, /styles\.topBar/);
  assert.match(p, /styles\.topBarTitle/);
  assert.match(p, /styles\.topBarRefresh/);
  assert.match(p, /推广员工具 · 任务跟进/);
  assert.doesNotMatch(p, /styles\.header/);
  assert.doesNotMatch(p, /styles\.back/);
  assert.doesNotMatch(c, /\.header\s*\{/);
});

test('W∞-94: employee follow-up adds heroCard + honest boundary on gray canvas', () => {
  const p = page();
  const c = taskCss();
  assert.match(p, /styles\.heroCard/);
  assert.match(p, /data-testid="employee-follow-up"/);
  assert.match(p, /记录本任务进展/);
  assert.match(p, /source=local/);
  assert.match(p, /不代履约美团\/抖音订单/);
  assert.match(p, /非本平台下单/);
  assert.match(p, /不含第三方订单履约与支付金额/);
  assert.doesNotMatch(p, /本平台收款/);
  assert.doesNotMatch(p, /完成支付|发起支付|本平台下单请|去支付/);
  assert.match(c, /\.topBar\s*\{/);
  assert.match(c, /\.heroCard\s*\{/);
  assert.match(c, /background:\s*#f5f5f5/);
});

test('W∞-94: honest employee follow-up keeps original-interaction copy and scope states', () => {
  const p = page();
  assert.match(p, /正在准备跟进记录/);
  assert.match(p, /无法记录跟进/);
  assert.match(p, /跟进记录暂不可用/);
  assert.match(p, /保存跟进/);
  assert.match(p, /下一任务/);
  assert.match(p, /历史跟进/);
  assert.match(p, /语音转写/);
  assert.match(p, /跟进已保存/);
  assert.doesNotMatch(p, /ONEDAY \//);
});

test('W∞-94: follow-up derives no fake BI metrics/mock (禁止假 BI)', () => {
  const p = page();
  assert.match(p, /items\.map/);
  assert.doesNotMatch(p, /Math\.random\(|mockMetrics|authMetrics/);
});
