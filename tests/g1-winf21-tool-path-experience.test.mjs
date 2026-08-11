import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const shell = () => read('apps/management-web/app/management-shell.tsx');
const home = () => read('apps/management-web/app/page.tsx');
const menu = () => read('packages/contracts/src/menu.ts');
const service = () => read('apps/consumer-web/app/c/services/[id]/service.tsx');
const channel = () => read('apps/consumer-web/app/c/stores/[id]/channel.tsx');
const profile = () => read('apps/consumer-web/app/c/profile/profile.tsx');
const proc = () => read('apps/consumer-web/app/c/processes/[id]/process.tsx');
const circleDash = () => read('apps/platform-web/app/bc/dashboard/page.tsx');
const entry = () => read('apps/consumer-web/app/c/entry/consumer-entry.tsx');

test('W∞-21: management shell drops stale 商家中心 store-ops identity', () => {
  const s = shell();
  const h = home();
  const m = menu();
  assert.match(s, /product="推广员工具"/);
  assert.match(s, /useState\('推广员工具 · 工作台'\)/);
  assert.match(h, /正在加载推广员工具工作台/);
  assert.match(h, /无法进入推广员工具工作台/);
  assert.match(h, /推广员工具 · 管理工作台/);
  // no leftover 商家中心 in shell/home
  assert.doesNotMatch(s, /商家中心/);
  assert.doesNotMatch(h, /商家中心/);
  // product-switcher label for management product is the tool identity
  assert.match(m, /\{ product: 'management', label: '推广员工具'/);
});

test('W∞-21: management nav labels frame entry/workflow, not store-sales ops', () => {
  const m = menu();
  assert.match(m, /key: 'stores'[\s\S]*?label: '门店入口'/);
  assert.match(m, /key: 'offers'[\s\S]*?label: '商品\/套餐入口'/);
  assert.match(m, /key: 'orders'[\s\S]*?label: '订单痕迹'/);
  assert.match(m, /key: 'page-builder'[\s\S]*?label: '入口页装修'/);
  assert.match(m, /key: 'settings'[\s\S]*?label: '工具设置'/);
  assert.match(m, /key: 'ai-suggestions'[\s\S]*?label: '作业建议'/);
  for (const stale of ['门店管理', '商品管理', '订单中心', '店铺装修', '商家设置', '经营建议']) {
    assert.doesNotMatch(m, new RegExp(`label: '${stale}'`));
  }
});

test('W∞-21: consumer third-party hand-off copy names 扫呗 consistently', () => {
  const ch = channel();
  const svc = service();
  const pro = profile();
  const prc = proc();
  // group-buy / menu / member / history sub-frames
  assert.match(ch, /跳转美团\/抖音\/扫呗等/);
  assert.match(ch, /前往美团\/抖音\/扫呗等/);
  assert.match(ch, /不替代美团\/抖音\/扫呗会员/);
  assert.match(ch, /不代表美团\/抖音\/扫呗等第三方订单/);
  // service detail, profile, process
  assert.match(svc, /跳转美团\/抖音\/扫呗等第三方/);
  assert.match(pro, /美团\/抖音\/扫呗等第三方订单/);
  assert.match(prc, /美团\/抖音\/扫呗等第三方订单履约/);
  // honest boundaries retained
  assert.match(ch, /不在此下单/);
  assert.match(svc, /不在此下单/);
});

test('W∞-21: platform circle dashboard + consumer entry honest boundary', () => {
  const cd = circleDash();
  const en = entry();
  assert.match(cd, /<dt>入口转化<\/dt>/);
  assert.doesNotMatch(cd, /<dt>订单<\/dt>/);
  assert.match(en, /成交在美团\/抖音\/扫呗等外部平台完成/);
});
