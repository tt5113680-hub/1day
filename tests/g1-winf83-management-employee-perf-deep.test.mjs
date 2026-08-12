import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const page = () =>
  readFileSync(
    join(root, 'apps/management-web/app/m/employee-process-performance/page.tsx'),
    'utf8',
  );
const css = () =>
  readFileSync(
    join(root, 'apps/management-web/app/m/employee-process-performance/page.module.css'),
    'utf8',
  );

test('W∞-83: /m/employee-process-performance keeps Meituan-parity yellow top bar + gray canvas + hero', () => {
  const p = page();
  const c = css();
  assert.match(p, /推广员工具 · 员工表现/);
  assert.match(p, /topBar/);
  assert.match(p, /topBarRefresh/);
  assert.match(p, /heroCard/);
  assert.match(p, /<h1>用任务、跟进、证据与贡献过程支持辅导<\/h1>/);
  assert.match(p, /刷新数据/);
  assert.match(c, /background:\s*#f5f5f5/);
  assert.match(c, /#ffd100|#ffe14d/);
});

test('W∞-83: /m/employee-process-performance adds real-data 员工表现分布 panel derived from employees', () => {
  const p = page();
  const c = css();
  assert.match(p, /aria-label="员工表现分布"/);
  assert.match(p, /员工表现分布/);
  assert.match(p, /由真实员工过程档案行现场推导/);
  assert.match(p, /backlogDist/);
  assert.match(p, /overdueDist/);
  assert.match(p, /followDist/);
  assert.match(p, /evidenceDist/);
  assert.match(p, /contributionDist/);
  for (const label of [
    '任务负载分布',
    '逾期信号分布',
    '跟进完整度分布',
    '证据链覆盖分布',
    '贡献关联分布',
  ]) {
    assert.match(p, new RegExp(`<h3>${label}</h3>`));
  }
  assert.match(p, /barWidth\(total, item\.value\)/);
  assert.match(p, /countBy\(/);
  assert.match(p, /暂无记录/);
  assert.match(c, /\.distribution/);
  assert.match(c, /\.panelBlock/);
  assert.match(c, /\.barFill/);
  assert.match(c, /\.barTrack/);
  assert.match(c, /\.barRow/);
  assert.match(c, /\.barValue/);
  assert.match(c, /\.barLabel/);
  assert.match(c, /\.barEmpty/);
  assert.match(c, /\.honest/);
  assert.match(c, /\.summaryStrip/);
});

test('W∞-83: distribution buckets derive from real employee rows (no fake BI)', () => {
  const p = page();
  assert.match(p, /employees\.map\(\(e\) => /);
  assert.match(p, /e\.openTasks \+ e\.overdueTasks/);
  assert.match(p, /e\.overdueTasks/);
  assert.match(p, /e\.followUps/);
  assert.match(p, /e\.evidenceLinks/);
  assert.match(p, /e\.contributionOrders/);
  assert.match(p, /barWidth = \(total: number, value: number\) => \(total \?/);
  assert.doesNotMatch(p, /假 BI|mockMetrics|Math\.random\(/);
  assert.match(p, /api\/v1\/management\/employee-process-performance/);
});

test('W∞-83: honest summary strip + source=local tool-identity boundaries preserved', () => {
  const p = page();
  assert.match(p, /aria-label="员工概况"/);
  assert.match(p, /在职员工/);
  assert.match(p, /有逾期信号/);
  assert.match(p, /已有跟进/);
  assert.match(p, /有贡献关联/);
  assert.match(p, /source=local/);
  assert.match(p, /不包含本平台收款/);
  assert.match(p, /非本平台下单/);
  assert.match(p, /不代表个人成交额或唯一绩效结论/);
  assert.match(p, /不接第三方实时人事\/绩效/);
  assert.match(p, /无权查看员工过程绩效/);
  assert.match(p, /请使用具备推广员工具权限的账号。/);
  assert.match(p, /推广员工具 · 员工表现/);
  assert.match(p, /data-testid="management-employee-process-performance"/);
});

test('W∞-83: process view rows + employee metrics export preserved', () => {
  const p = page();
  assert.match(p, /<h2>过程视图<\/h2>/);
  assert.match(p, /employee\.overdueTasks/);
  assert.match(p, /employee\.completedTasks/);
  assert.match(p, /employee\.followUps/);
  assert.match(p, /employee\.evidenceLinks/);
  assert.match(p, /employee\.contributionOrders/);
  assert.match(p, /employee\.coaching/);
  assert.match(p, /当前没有可展示的在职员工过程记录。/);
});
