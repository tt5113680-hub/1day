import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const circleDetail = () =>
  readFileSync(join(root, 'apps/consumer-web/app/c/circles/[id]/circle-detail.tsx'), 'utf8');
const circlesCss = () =>
  readFileSync(join(root, 'apps/consumer-web/app/c/circles/circles.module.css'), 'utf8');
const search = () => readFileSync(join(root, 'apps/consumer-web/app/c/search/search.tsx'), 'utf8');
const searchCss = () =>
  readFileSync(join(root, 'apps/consumer-web/app/c/search/search.module.css'), 'utf8');
const action = () =>
  readFileSync(join(root, 'apps/consumer-web/app/c/actions/[id]/action.tsx'), 'utf8');
const actionCss = () =>
  readFileSync(join(root, 'apps/consumer-web/app/c/actions/[id]/action.module.css'), 'utf8');

test('W∞-76: circle-detail page renders hero + summary + distribution panel from real circles rows', () => {
  const p = circleDetail();
  assert.match(p, /styles\.heroCard/);
  assert.match(p, /aria-label="商圈详情概况"/);
  assert.match(p, /styles\.summaryStrip/);
  assert.match(p, /aria-label="商圈详情数据概况"/);
  assert.match(p, /styles\.distribution/);
  assert.match(p, /aria-label="商圈详情分布"/);
  assert.match(p, /商户可进店分布/);
  assert.match(p, /商圈身份分布/);
  assert.match(p, /入驻商户分布/);
  assert.match(p, /data\.merchants\.map/);
  assert.match(p, /m\.entryUrl/);
  assert.match(p, /countBy\(/);
  assert.match(p, /barWidth\(/);
  assert.match(p, /暂无商户记录/);
});

test('W∞-76: circle-detail honest boundary + shared visual language retained', () => {
  const p = circleDetail();
  const c = circlesCss();
  assert.match(p, /推广员工具/);
  assert.match(p, /source=local/);
  assert.match(p, /美团\/抖音\/扫呗/);
  assert.match(p, /仅统计观看\/访问\/跳转\/停留\/分享入口痕迹/);
  assert.match(p, /不含支付金额/);
  assert.match(p, /不在此下单/);
  assert.match(p, /非本平台下单/);
  assert.match(c, /linear-gradient\(90deg, var\(--od-brand-700\), var\(--od-brand-600\)\)/);
  assert.match(c, /var\(--od-sf-white\)/);
  assert.match(c, /var\(--od-sf-shadow-card\)/);
});

test('W∞-76: search page renders hero + summary + distribution from real SearchResult rows', () => {
  const p = search();
  assert.match(p, /styles\.heroCard/);
  assert.match(p, /aria-label="搜索结果概况"/);
  assert.match(p, /styles\.summaryStrip/);
  assert.match(p, /aria-label="搜索数据概况"/);
  assert.match(p, /styles\.distribution/);
  assert.match(p, /aria-label="搜索结果分布"/);
  assert.match(p, /评分分布/);
  assert.match(p, /距离带分布/);
  assert.match(p, /入口可用性分布/);
  assert.match(p, /人气带分布/);
  assert.match(p, /data\.items\.map/);
  assert.match(p, /item\.rating/);
  assert.match(p, /item\.distanceKm/);
  assert.match(p, /item\.entryUrl/);
  assert.match(p, /item\.salesHint/);
  assert.match(p, /countBy\(/);
  assert.match(p, /barWidth\(/);
  assert.match(p, /暂无搜索结果/);
});

test('W∞-76: search honest boundary + tokenized shared visual language', () => {
  const p = search();
  const c = searchCss();
  assert.match(p, /推广员工具/);
  assert.match(p, /source=local/);
  assert.match(p, /美团\/抖音\/扫呗/);
  assert.match(p, /仅统计观看\/访问\/跳转\/停留\/分享入口痕迹/);
  assert.match(p, /不含支付金额/);
  assert.match(p, /不在此下单/);
  assert.match(p, /非本平台下单/);
  assert.match(c, /linear-gradient\(90deg, var\(--od-brand-700\), var\(--od-brand-600\)\)/);
  assert.match(c, /var\(--od-sf-canvas\)/);
  assert.match(c, /var\(--od-sf-white\)/);
  assert.match(c, /var\(--od-sf-shadow-card\)/);
  assert.doesNotMatch(c, /#392119/);
  assert.doesNotMatch(c, /#fff9f5/);
});

test('W∞-76: actions confirm page densified to overlow yellow top bar + honest tokenized confirm', () => {
  const p = action();
  const c = actionCss();
  assert.match(p, /od-sf-theme/);
  assert.match(p, /styles\.topBar/);
  assert.match(p, /styles\.topTitle/);
  assert.match(p, /外链确认/);
  assert.match(p, /styles\.honest/);
  assert.match(p, /source=local/);
  assert.match(p, /美团\/抖音\/扫呗/);
  assert.match(p, /不含支付金额/);
  assert.match(p, /不在此下单/);
  assert.match(p, /非本平台下单/);
  assert.match(p, /jump_confirm/);
  assert.doesNotMatch(p, /consumer_orders/);
  assert.match(c, /var\(--od-sf-canvas\)/);
  assert.match(c, /var\(--od-sf-white\)/);
  assert.match(c, /var\(--od-sf-shadow-card\)/);
  assert.match(c, /topBar/);
  assert.doesNotMatch(c, /#392119/);
  assert.doesNotMatch(c, /#fff9f5/);
});
