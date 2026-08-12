import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const offers = () => read('apps/management-web/app/m/offers/page.tsx');
const offersCss = () => read('apps/management-web/app/m/offers/page.module.css');

test('G1-W∞-86: /m/offers adds Meituan-parity summaryStrip overview bar', () => {
  assert.match(offers(), /data-testid="management-offers"/);
  assert.match(offers(), /aria-label="商品套餐数据概况"/);
  assert.match(offers(), /className=\{styles\.summaryStrip\}/);
});

test('G1-W∞-86: summaryStrip values are real-data derived from fetched rows', () => {
  assert.match(offers(), /stores\.length/);
  assert.match(offers(), /allServices\.length/);
  assert.match(offers(), /allOffers\.length/);
  assert.match(offers(), /allOffers\.filter\(\(offer\) => offer\.status === 'active'\)\.length/);
});

test('G1-W∞-86: summaryStrip CSS present with responsive single-column stacking', () => {
  assert.match(offersCss(), /\.summaryStrip\s*\{/);
  assert.match(offersCss(), /grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\);/);
  assert.match(offersCss(), /\.summaryStrip strong\s*\{/);
  assert.match(offersCss(), /\.summaryStrip span\s*\{/);
  assert.match(
    offersCss(),
    /@media \(max-width: 900px\)[\s\S]*\.summaryStrip\s*\{\s*grid-template-columns:\s*1fr 1fr;/,
  );
});

test('G1-W∞-86: offers keeps distribution panel + honest no-native-checkout boundary', () => {
  assert.match(offers(), /aria-label="商品套餐分布"/);
  assert.match(offers(), /aria-label="新建商品套餐"/);
  assert.match(offers(), /推广员工具 · 商品\/套餐入口/);
  assert.doesNotMatch(offers(), /AdminPageHeader/);
  assert.doesNotMatch(offers(), /eyebrow=/);
  // honest boundaries retained (source=local, not Meituan real-time, no native checkout)
  assert.match(offers(), /source=local/);
  assert.match(offers(), /不接美团\/抖音实时价格/);
  assert.match(offers(), /不包含本平台收款/);
  assert.match(offers(), /非本平台下单/);
});
