import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('G1-W∞-19: management commerce tool-path gap normalization', () => {
  const root = process.cwd();
  const read = (rel) => readFileSync(join(root, rel), 'utf8');

  const offers = read('apps/management-web/app/m/offers/page.tsx');
  const stores = read('apps/management-web/app/m/stores/page.tsx');

  assert.match(offers, /推广员工具 · 商品\/套餐入口/);
  assert.match(offers, /维护服务\/套餐真源与受控平台价格入口/);
  assert.match(offers, /不宣称第三方实时同步/);
  assert.match(offers, /也不在此售卖下单/);
  assert.doesNotMatch(offers, /美团商家端 PC/);

  assert.match(stores, /推广员工具 · 门店入口/);
  assert.match(stores, /维护门店营业状态、资料、统一入口与负责人/);
  assert.match(stores, /不代替平台下单\/支付/);
  assert.doesNotMatch(stores, /美团商家端 PC/);
});
