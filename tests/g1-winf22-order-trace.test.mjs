import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const orders = () => read('apps/management-web/app/m/orders/page.tsx');
const menu = () => read('packages/contracts/src/menu.ts');

test('W∞-22: management orders page is framed as trace archive, matching menu 订单痕迹', () => {
  const o = orders();
  // title & header aligned to the trace/menu label (no 订单中心 store-ops title)
  assert.match(o, /title="订单痕迹"/);
  assert.match(o, /eyebrow="推广员工具 · 订单痕迹"/);
  assert.doesNotMatch(o, /title="订单中心"/);
  assert.doesNotMatch(o, /eyebrow="推广员工具 · 订单档案"/);
  // loading / forbidden / error states speak of 痕迹, not a sales center
  assert.match(o, /正在加载订单痕迹/);
  assert.match(o, /无权查看订单痕迹/);
  assert.match(o, /订单痕迹暂不可用/);
  assert.doesNotMatch(o, /订单中心/);
  // menu label is 订单痕迹 (kept consistent from W∞-21)
  assert.match(menu(), /key: 'orders'[\s\S]*?label: '订单痕迹'/);
});

test('W∞-22: orders summary metrics reframe native payment/fulfillment as archive references', () => {
  const o = orders();
  assert.match(o, /档案记录数/);
  assert.match(o, /状态为有效的记录/);
  assert.match(o, /记录金额参考/);
  assert.match(o, /涉及门店/);
  // no native-payment / native-fulfillment labels
  assert.doesNotMatch(o, /<span>订单数<\/span>/);
  assert.doesNotMatch(o, /<span>已支付\/核销<\/span>/);
  assert.doesNotMatch(o, /<span>本列表金额<\/span>/);
});

test('W∞-22: honest no-native-checkout / no-native-payment boundary retained', () => {
  const o = orders();
  assert.match(o, /不包含本平台收款/);
  assert.match(o, /非本平台下单/);
  assert.match(o, /不代表第三方订单履约/);
  assert.match(o, /不伪造第三方成交/);
  assert.match(o, /不接美团实时订单/);
  assert.match(o, /source=local/);
  // empty state speaks of third-party trace aggregation
  assert.match(o, /暂无订单痕迹/);
  assert.match(o, /第三方成交痕迹/);
});
