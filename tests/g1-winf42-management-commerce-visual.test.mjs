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

test('G1-W∞-42: orders/reviews/marketing use 黄顶栏 topBar (+ refresh) + 灰底白卡 canvas', () => {
  for (const src of [orders(), reviews(), marketing()]) {
    assert.match(src, /className=\{styles\.topBar\}/);
    assert.match(src, /className=\{styles\.topBarTitle\}/);
    assert.match(src, /className=\{styles\.topBarRefresh\}/);
    assert.match(src, /刷新/);
    assert.match(src, /className=\{styles\.heroCard\}/);
    assert.match(src, /<h1>/);
    assert.doesNotMatch(src, /AdminPageHeader/);
    assert.doesNotMatch(src, /eyebrow=/);
    assert.match(src, /className=\{styles\.summaryStrip\}/);
    assert.match(src, /className=\{styles\.honest\}/);
  }
  assert.match(css(), /background:\s*linear-gradient\(180deg,\s*#ffe14d/);
  assert.match(css(), /background:\s*#f5f5f5/);
  assert.match(css(), /background:\s*#fff/);
});

test('G1-W∞-42: topBar carries established eyebrow, heroCard carries title', () => {
  assert.match(orders(), /推广员工具 · 订单痕迹/);
  assert.match(orders(), /<h1>订单痕迹<\/h1>/);
  assert.match(reviews(), /推广员工具 · 评价档案/);
  assert.match(reviews(), /<h1>评价档案<\/h1>/);
  assert.match(marketing(), /推广员工具 · 营销档案/);
  assert.match(marketing(), /<h1>营销活动<\/h1>/);
});

test('G1-W∞-42: honest no-native-checkout boundary retained', () => {
  assert.match(orders(), /不接美团实时订单/);
  assert.match(orders(), /非本平台下单/);
  assert.match(reviews(), /不接美团评价接口/);
  assert.match(reviews(), /不伪造第三方评价分/);
  assert.match(marketing(), /不接美团\/抖音实时投放/);
  assert.match(marketing(), /非本平台成交/);
});

test('G1-W∞-42: full list/state hooks preserved for e2e', () => {
  assert.match(orders(), /data-testid="management-orders"/);
  assert.match(reviews(), /data-testid="management-reviews"/);
  assert.match(marketing(), /data-testid="management-marketing"/);
  for (const src of [orders(), reviews(), marketing()]) {
    assert.match(src, /正在加载/);
    assert.match(src, /无权查看/);
  }
});
