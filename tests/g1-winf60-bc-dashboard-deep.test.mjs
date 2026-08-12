import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const c = () => read('apps/platform-web/app/bc/dashboard/page.tsx');
const cCss = () => read('apps/platform-web/app/bc/dashboard/page.module.css');

test('G1-W∞-60: /bc/dashboard adds real-data 商圈联盟分布 panel', () => {
  assert.match(c(), /aria-label="商圈联盟分布"/);
  assert.match(c(), /circleScaleCounts/);
  assert.match(c(), /merchantBenefitCounts/);
  assert.match(c(), /contentDensityCounts/);
  assert.match(c(), /trafficDensityCounts/);
  assert.match(c(), /conversionDensityCounts/);
  for (const label of [
    '联盟规模分布',
    '商户权益覆盖分布',
    '内容密度分布',
    '流量行为分布',
    '入口转化分布',
  ]) {
    assert.match(c(), new RegExp(`<h2>${label}</h2>`));
  }
  assert.match(c(), /barWidth\(data\?\.circles\.length \?\? 0, b\.value\)/);
  assert.match(c(), /barWidth\(merchantTotal, b\.value\)/);
  assert.match(c(), /暂无记录/);
  assert.match(c(), /非本平台下单/);
});

test('G1-W∞-60: /bc/dashboard keeps circle Meituan-parity yellow top bar + gray canvas + summary', () => {
  assert.match(c(), /推广员工具 · 商圈联盟/);
  assert.match(c(), /<h1>成员权益、内容、流量与入口转化<\/h1>/);
  assert.match(c(), /topBar/);
  assert.match(c(), /heroCard/);
  assert.match(c(), /summaryStrip/);
  assert.match(c(), /aria-label="商圈联盟概况"/);
  assert.match(cCss(), /background:\s*#f5f5f5/);
});

test('G1-W∞-60: /bc/dashboard distribution/bar CSS present + responsive stacking', () => {
  assert.match(cCss(), /\.distribution\s*\{/);
  assert.match(cCss(), /\.panelBlock\s*\{/);
  assert.match(cCss(), /\.barFill\s*\{/);
  assert.match(cCss(), /\.barTrack\s*\{/);
  assert.match(cCss(), /\.barRow\s*\{/);
  assert.match(cCss(), /\.barValue\s*\{/);
  assert.match(cCss(), /\.barLabel\s*\{/);
  assert.match(cCss(), /\.barEmpty\s*\{/);
  assert.match(cCss(), /\.summaryStrip\s*\{/);
  assert.match(cCss(), /\.barFill\s*\{\s*display:\s*block;/);
  assert.match(cCss(), /background:\s*linear-gradient\(90deg,\s*#ffd100,\s*#f0a500\);/);
  assert.match(cCss(), /\.distribution\s*\{\s*grid-template-columns:\s*1fr;\s*\}/);
});

test('G1-W∞-60: honest source=local disclaimer and circle alliance ops preserved', () => {
  assert.match(c(), /source=local/);
  assert.match(c(), /商圈是商家联盟整合网络/);
  assert.match(c(), /不包含本平台收款/);
  assert.match(c(), /未接美团实时商户数据/);
  assert.match(c(), /api\/v1\/circle\/dashboard/);
  assert.match(c(), /data\.circles\.map/);
  assert.match(c(), /circle\.merchants\.map/);
  assert.match(c(), /已确认入口转化/);
});
