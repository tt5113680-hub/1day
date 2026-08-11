import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const offers = () => read('apps/management-web/app/m/offers/page.tsx');
const stores = () => read('apps/management-web/app/m/stores/page.tsx');
const reviews = () => read('apps/management-web/app/m/reviews/page.tsx');
const marketing = () => read('apps/management-web/app/m/marketing/page.tsx');
const menu = () => read('packages/contracts/src/menu.ts');

test('W∞-23: /m/offers page heading + states aligned to nav label 商品/套餐入口', () => {
  const o = offers();
  assert.match(o, /推广员工具 · 商品\/套餐入口/);
  assert.match(o, /<h1>商品\/套餐入口<\/h1>/);
  assert.match(o, /正在加载商品\/套餐入口/);
  assert.match(o, /无权访问商品\/套餐入口/);
  assert.doesNotMatch(o, /商品管理/);
  assert.match(menu(), /key: 'offers'[\s\S]*?label: '商品\/套餐入口'/);
});

test('W∞-23: /m/stores page heading + states aligned to nav label 门店入口', () => {
  const s = stores();
  assert.match(s, /推广员工具 · 门店入口/);
  assert.match(s, /<h1>门店入口<\/h1>/);
  assert.match(s, /正在加载门店入口/);
  assert.match(s, /无权访问门店入口/);
  assert.doesNotMatch(s, /门店管理/);
  assert.doesNotMatch(s, /门店经营数据/);
  assert.match(menu(), /key: 'stores'[\s\S]*?label: '门店入口'/);
});

test('W∞-23: /m/reviews page heading + states framed as honest 评价档案 (menu label aligned)', () => {
  const r = reviews();
  assert.match(r, /eyebrow="推广员工具 · 评价档案"/);
  assert.match(r, /title="评价档案"/);
  assert.match(r, /正在加载评价档案/);
  assert.match(r, /无权查看评价档案/);
  assert.doesNotMatch(r, /评价管理/);
  assert.match(menu(), /key: 'reviews'[\s\S]*?label: '评价档案'/);
  assert.doesNotMatch(menu(), /key: 'reviews'[\s\S]*?label: '评价管理'/);
});

test('W∞-23: /m/marketing page heading + states aligned to nav label 营销活动', () => {
  const m = marketing();
  assert.match(m, /eyebrow="推广员工具 · 营销档案"/);
  assert.match(m, /title="营销活动"/);
  assert.match(m, /正在加载营销活动/);
  assert.match(m, /无权查看营销活动/);
  assert.doesNotMatch(m, /营销中心/);
  assert.match(menu(), /key: 'marketing'[\s\S]*?label: '营销活动'/);
});

test('W∞-23: honest no-native-checkout boundary retained across the four surfaces', () => {
  assert.match(offers(), /不在此售卖下单/);
  assert.match(offers(), /不宣称第三方实时同步/);
  assert.match(stores(), /不代替平台下单\/支付/);
  assert.match(stores(), /不含第三方订单履约/);
  assert.match(reviews(), /不接第三方评价流/);
  assert.match(reviews(), /不伪造第三方评价分/);
  assert.match(marketing(), /不接美团\/抖音实时投放/);
  assert.match(marketing(), /非本平台成交/);
});
