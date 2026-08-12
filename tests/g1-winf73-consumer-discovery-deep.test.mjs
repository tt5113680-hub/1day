import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const page = () =>
  readFileSync(join(root, 'apps/consumer-web/app/c/discovery/discovery.tsx'), 'utf8');
const css = () =>
  readFileSync(join(root, 'apps/consumer-web/app/c/discovery/discovery.module.css'), 'utf8');

test('W∞-73: discovery page renders Meituan sticky yellow bar + grey-white cards + tool identity', () => {
  const p = page();
  assert.match(p, /styles\.stickyBar/);
  assert.match(p, /推广员工具/);
  assert.match(p, /全平台可见引流商家/);
  assert.match(p, /aria-label="附近概况"/);
  assert.match(p, /styles\.heroCard/);
});

test('W∞-73: hero card + summary strip + nearby merchant distribution panel exist', () => {
  const p = page();
  assert.match(p, /styles\.heroCard/);
  assert.match(p, /aria-label="附近数据概况"/);
  assert.match(p, /styles\.summaryStrip/);
  assert.match(p, /aria-label="附近商家分布"/);
  assert.match(p, /styles\.distribution/);
  assert.match(p, /评分分布/);
  assert.match(p, /距离带分布/);
  assert.match(p, /人气带分布/);
  assert.match(p, /入口可用性分布/);
  assert.match(p, /发现面分布/);
});

test('W∞-73: distributions derive from real Discovery rows (no fake BI)', () => {
  const p = page();
  assert.match(p, /data\.nearby\.map/);
  assert.match(p, /item\.rating/);
  assert.match(p, /item\.distanceKm/);
  assert.match(p, /item\.salesHint/);
  assert.match(p, /item\.entryUrl/);
  assert.match(p, /countBy\(/);
  assert.match(p, /barWidth\(/);
  assert.match(p, /暂无附近记录/);
});

test('W∞-73: yellow gradient bars + white cards on gray canvas, honest boundary retained', () => {
  const p = page();
  const c = css();
  assert.match(c, /linear-gradient\(90deg, var\(--od-brand-700\), var\(--od-brand-600\)\)/);
  assert.match(c, /var\(--od-sf-white\)/);
  assert.match(c, /var\(--od-sf-shadow-card\)/);
  assert.match(p, /source=local/);
  assert.match(p, /不在此下单/);
  assert.match(p, /非本平台下单/);
  assert.match(p, /美团\/抖音\/扫呗/);
  assert.match(p, /仅统计观看\/访问\/跳转\/停留\/分享入口痕迹/);
  assert.match(p, /不含支付金额/);
});
