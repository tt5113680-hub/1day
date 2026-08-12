import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const employeePage = () =>
  readFileSync(join(root, 'apps/employee-web/app/e/workbench/workbench.tsx'), 'utf8');
const employeeCss = () =>
  readFileSync(join(root, 'apps/employee-web/app/e/workbench/workbench.module.css'), 'utf8');
const managementPage = () => readFileSync(join(root, 'apps/management-web/app/page.tsx'), 'utf8');
const managementCss = () =>
  readFileSync(join(root, 'apps/management-web/app/page.module.css'), 'utf8');

test('W∞-78: employee workbench adds real-data distribution panel', () => {
  const p = employeePage();
  const c = employeeCss();
  assert.match(p, /aria-label="工作台作业分布"/);
  assert.match(p, /状态分布/);
  assert.match(p, /升级分布/);
  assert.match(p, /客户关联分布/);
  assert.match(p, /到期窗口分布/);
  assert.match(p, /来源分布/);
  assert.match(p, /行动机会分布/);
  assert.match(p, /EmployeeWorkbenchKpiStrip/);
  assert.match(p, /barWidth\(/);
  assert.match(p, /countBy\(/);
  assert.match(c, /\.distribution/);
  assert.match(c, /\.barFill/);
});

test('W∞-78: employee workbench distributions derive from workbench rows', () => {
  const p = employeePage();
  assert.match(p, /openTasks/);
  assert.match(p, /customerReminders/);
  assert.match(p, /opportunities/);
  assert.match(p, /allRows/);
  assert.match(p, /opportunityDist/);
  assert.doesNotMatch(p, /假 BI|mockMetrics|Math\.random\(/);
});

test('W∞-78: management dashboard adds real-data distribution panel', () => {
  const p = managementPage();
  const c = managementCss();
  assert.match(p, /aria-label="管理工作台分布"/);
  assert.match(p, /待办指标分布/);
  assert.match(p, /客户门店分布/);
  assert.match(p, /异常类型分布/);
  assert.match(p, /提醒队列分布/);
  assert.match(p, /barWidth\(/);
  assert.match(p, /countBy\(/);
  assert.match(c, /\.distribution/);
  assert.match(c, /\.barFill/);
});

test('W∞-78: management dashboard distributions derive from dashboard metrics and queues', () => {
  const p = managementPage();
  assert.match(p, /taskMetricDist/);
  assert.match(p, /customerMetricDist/);
  assert.match(p, /anomalyDist/);
  assert.match(p, /data\?\.metrics/);
  assert.match(p, /data\?\.anomalies/);
  assert.match(p, /data\?\.suggestions/);
  assert.doesNotMatch(p, /假 BI|mockMetrics|Math\.random\(/);
});

test('W∞-78: honest tool identity boundaries preserved on both workbenches', () => {
  const e = employeePage();
  const m = managementPage();
  assert.match(e, /不含第三方订单履约/);
  assert.match(e, /非本平台下单/);
  assert.match(e, /source=local/);
  assert.match(m, /不含支付金额/);
  assert.match(m, /非本平台下单/);
  assert.match(m, /source=local/);
  assert.match(m, /近30日服务档案/);
});
