import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const orders = () => read('apps/management-web/app/m/orders/page.tsx');
const reviews = () => read('apps/management-web/app/m/reviews/page.tsx');
const marketing = () => read('apps/management-web/app/m/marketing/page.tsx');
const css = () => read('apps/management-web/app/m/_commerce.module.css');

test('G1-W∞-45: orders adds real-data 状态/门店/来源 distribution panel', () => {
  assert.match(orders(), /aria-label="订单痕迹分布"/);
  assert.doesNotMatch(orders(), /AdminPageHeader/);
  // real-data buckets computed from fetched rows
  assert.match(orders(), /statusBuckets\s*=\s*\{/);
  assert.match(orders(), /storeCounts\.set/);
  assert.match(orders(), /sourceCounts\.set/);
  for (const label of ['状态分布', '门店分布', '来源分布']) {
    assert.match(orders(), new RegExp(`<h2>${label}</h2>`));
  }
  // share bars are real-data driven (not hard-coded percentages)
  assert.match(orders(), /orders\.length \? \(b\.value \/ orders\.length\)/);
  assert.match(orders(), /暂无记录/);
});

test('G1-W∞-45: reviews adds real-data 评分/门店 distribution panel', () => {
  assert.match(reviews(), /aria-label="评价分布"/);
  assert.match(reviews(), /ratingBuckets/);
  assert.match(reviews(), /reviewScope\.set/);
  assert.match(reviews(), /<h2>评分分布<\/h2>/);
  assert.match(reviews(), /<h2>门店分布<\/h2>/);
  assert.match(reviews(), /暂无评价/);
});

test('G1-W∞-45: marketing adds real-data 状态/类型 distribution panel', () => {
  assert.match(marketing(), /aria-label="营销分布"/);
  assert.match(marketing(), /campaignBuckets/);
  assert.match(marketing(), /typeBuckets/);
  assert.match(marketing(), /<h2>状态分布<\/h2>/);
  assert.match(marketing(), /<h2>类型分布<\/h2>/);
  assert.match(marketing(), /暂无活动/);
});

test('G1-W∞-45: shared panel/bar CSS present + responsive stacking', () => {
  assert.match(css(), /\.panel\s*\{/);
  assert.match(css(), /\.panelBlock\s*\{/);
  assert.match(css(), /\.barFill\s*\{/);
  assert.match(css(), /\.barTrack\s*\{/);
  assert.match(css(), /\.barRow\s*\{/);
  assert.match(css(), /\.barEmpty\s*\{/);
  assert.match(css(), /\.panel\s*\{\s*grid-template-columns:\s*1fr;\s*\}/);
});

test('G1-W∞-45: honest no-native-checkout boundary + e2e hooks retained', () => {
  for (const src of [orders(), reviews(), marketing()]) {
    assert.match(src, /className=\{styles\.summaryStrip\}/);
    assert.match(src, /className=\{styles\.honest\}/);
  }
  assert.match(orders(), /不接美团实时订单/);
  assert.match(orders(), /非本平台下单/);
  assert.match(orders(), /data-testid="management-orders"/);
  assert.match(reviews(), /不伪造第三方评价分/);
  assert.match(reviews(), /data-testid="management-reviews"/);
  assert.match(marketing(), /不接美团\/抖音实时投放/);
  assert.match(marketing(), /data-testid="management-marketing"/);
});
