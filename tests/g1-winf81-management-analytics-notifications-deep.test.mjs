import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const analyticsPage = () => read('apps/management-web/app/m/analytics/page.tsx');
const analyticsCss = () => read('apps/management-web/app/m/analytics/page.module.css');
const notificationsPage = () => read('apps/management-web/app/m/notifications/page.tsx');
const commerceCss = () => read('apps/management-web/app/m/_commerce.module.css');

test('W∞-81: /m/analytics adds real-data 经营分析分布 panel derived from daily L0–L2 rows', () => {
  const p = analyticsPage();
  const c = analyticsCss();
  assert.match(p, /aria-label="经营分析分布"/);
  assert.match(p, /经营分析分布/);
  assert.match(p, /由真实 L0–L2 痕迹行推导/);
  assert.match(p, /funnelDist/);
  assert.match(p, /actionDist/);
  assert.match(p, /dayDist/);
  for (const label of ['今日漏斗分布', '今日 L2 动作分布', '逐日流量分布']) {
    assert.match(p, new RegExp(`<h3>${label}`));
  }
  assert.match(p, /barWidth\(total, item\.value\)/);
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
});

test('W∞-81: /m/analytics distribution buckets derive from real today + per-day fields (no fake BI)', () => {
  const p = analyticsPage();
  assert.match(p, /data\.today\.impressions/);
  assert.match(p, /data\.today\.visits/);
  assert.match(p, /data\.today\.jumps/);
  assert.match(p, /data\.today\.dwells/);
  assert.match(p, /data\.today\.shares/);
  assert.match(p, /data\.today\.moduleImpressions/);
  assert.match(p, /data\.today\.consultClicks/);
  assert.match(p, /data\.daily\.map/);
  assert.doesNotMatch(p, /假 BI|mockMetrics|Math\.random\(/);
  assert.match(p, /daily-report/);
});

test('W∞-81: /m/notifications uses yellow top bar + hero + summary, no AdminPageHeader', () => {
  const p = notificationsPage();
  const c = commerceCss();
  assert.match(p, /推广员工具 · 通知中心/);
  assert.match(p, /className=\{styles\.topBar\}/);
  assert.match(p, /className=\{styles\.topBarRefresh\}/);
  assert.match(p, /className=\{styles\.heroCard\}/);
  assert.match(p, /<h1>通知中心<\/h1>/);
  assert.doesNotMatch(p, /AdminPageHeader/, 'no AdminPageHeader');
  assert.doesNotMatch(p, /eyebrow=/, 'no eyebrow prop');
  assert.match(p, /aria-label="通知概况"/);
  assert.match(p, /待办总数/);
  assert.match(c, /\.honest/);
});

test('W∞-81: /m/notifications adds real-data 通知分布 panel derived from notification rows', () => {
  const p = notificationsPage();
  const c = commerceCss();
  assert.match(p, /aria-label="通知分布"/);
  assert.match(p, /由真实租户待推进文件行推导/);
  assert.match(p, /typeDist/);
  assert.match(p, /destinationDist/);
  assert.match(p, /loadDist/);
  for (const label of ['通知类型分布', '推进去向分布', '待办负载分布']) {
    assert.match(p, new RegExp(`<h3>${label}</h3>`));
  }
  assert.match(p, /item\.category/);
  assert.match(p, /item\.deepLink/);
  assert.match(p, /counts\.anomaly/);
  assert.match(p, /barWidth\(total, item\.value\)/);
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
});

test('W∞-81: honest source=local + tool-identity boundaries preserved on both pages', () => {
  const a = analyticsPage();
  assert.match(a, /source=local/);
  assert.match(a, /不含支付、成交或第三方订单数据/);
  assert.match(a, /推广员工具 · 数据\/经营分析/);
  assert.match(a, /无权查看数据分析/);

  const n = notificationsPage();
  assert.match(n, /source=local/);
  assert.match(n, /不包含支付金额、销售成交或第三方订单履约状态/);
  assert.match(n, /推广员工具 · 通知中心/);
  assert.match(n, /无权查看通知中心/);
  assert.match(n, /api\/v1\/management\/notifications/);
});
