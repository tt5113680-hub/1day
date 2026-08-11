import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const offers = () => read('apps/management-web/app/m/offers/page.tsx');
const offersCss = () => read('apps/management-web/app/m/offers/page.module.css');

test('G1-W∞-47: offers adds real-data 商品套餐 distribution panel', () => {
  assert.match(offers(), /aria-label="商品套餐分布"/);
  assert.doesNotMatch(offers(), /AdminPageHeader/);
  // real-data buckets computed from fetched store/service/offer rows
  assert.match(offers(), /serviceStatusCounts\.set/);
  assert.match(offers(), /platformCounts\.set/);
  assert.match(offers(), /offerStatusCounts\.set/);
  assert.match(offers(), /bandCounts\.set/);
  for (const label of [
    '套餐可见分布',
    '门店分布',
    '平台入口分布',
    'Offer 状态分布',
    '价格带分布',
  ]) {
    assert.match(offers(), new RegExp(`<h2>${label}</h2>`));
  }
  // platform label mapping to mature names (not raw enum uuids)
  assert.match(offers(), /meituan: '美团'/);
  assert.match(offers(), /douyin: '抖音'/);
  assert.match(offers(), /saabei: '扫呗'/);
  assert.match(offers(), /external: '直接外链'/);
  // share bars are real-data driven (not hard-coded percentages)
  assert.match(offers(), /allServices\.length \? \(b\.value \/ allServices\.length\)/);
  assert.match(offers(), /暂无记录/);
  // honest no-native-checkout boundary retained
  assert.match(offers(), /非本平台下单/);
});

test('G1-W∞-47: offers keeps create/service catalog + e2e interactions intact', () => {
  assert.doesNotMatch(offers(), /eyebrow=/);
  // top bar + hero retained
  assert.match(offers(), /推广员工具 · 商品\/套餐入口/);
  assert.match(offers(), /新建商品\/套餐/);
  assert.match(offers(), /aria-label="新建商品套餐"/);
  assert.match(offers(), /Offer 已关联到受控 HTTPS 入口/);
});

test('G1-W∞-47: offers distribution/bar CSS present + responsive stacking', () => {
  assert.match(offersCss(), /\.distribution\s*\{/);
  assert.match(offersCss(), /\.panelBlock\s*\{/);
  assert.match(offersCss(), /\.barFill\s*\{/);
  assert.match(offersCss(), /\.barTrack\s*\{/);
  assert.match(offersCss(), /\.barRow\s*\{/);
  assert.match(offersCss(), /\.barValue\s*\{/);
  assert.match(offersCss(), /\.barEmpty\s*\{/);
  assert.match(offersCss(), /\.barFill\s*\{\s*display:\s*block;/);
  assert.match(offersCss(), /background:\s*linear-gradient\(90deg,\s*#ffd100,\s*#f0a500\);/);
});

test('G1-W∞-47: honest source=local disclaimer and price-band buckets present', () => {
  assert.match(offers(), /source=local/);
  assert.match(offers(), /不接美团\/抖音实时价格/);
  assert.match(offers(), /priceBand/);
  assert.match(offers(), /¥0-100/);
  assert.match(offers(), /¥300\+/);
});
