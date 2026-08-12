import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const page = () => read('apps/employee-web/app/e/store/store-home.tsx');
const css = () => read('apps/employee-web/app/e/store/store-home.module.css');

test('W∞-66: employee store home has Meituan merchant sticky yellow top bar', () => {
  const p = page();
  const c = css();
  assert.match(p, /推广员工具 · 店长模式/);
  assert.match(p, /className=\{styles\.topBar\}/);
  assert.match(c, /background:\s*linear-gradient\(180deg,\s*#ffe14d/);
  assert.match(c, /background:\s*#f5f5f5/);
  assert.match(p, /<h1>门店入口首页<\/h1>/);
});

test('W∞-66: employee store home adds real-data distribution panel', () => {
  const p = page();
  assert.match(p, /aria-label="门店概况"/);
  assert.match(p, /aria-label="门店授权分布"/);
  assert.match(p, /授权门店分布/);
  assert.match(p, /数据范围类型分布/);
  assert.match(p, /会话角色分布/);
  assert.match(p, /数据范围标签分布/);
});

test('W∞-66: employee store distributions derive from managed-stores + menu scopes', () => {
  const p = page();
  assert.match(p, /\/api\/v1\/employee\/managed-stores/);
  assert.match(p, /\/api\/v1\/me\/menu\?product=employee/);
  assert.match(p, /countBy\(stores\.map/);
  assert.match(p, /countBy\(scopes\.map/);
  assert.match(p, /countBy\(roles\.map/);
  assert.match(p, /scopeTypeLabel\(scope\.type\)/);
});

test('W∞-66: honest employee store boundaries preserved', () => {
  const p = page();
  assert.match(p, /不碰钱/);
  assert.match(p, /本页不含支付金额/);
  assert.match(p, /非本平台下单/);
  assert.match(p, /source=local/);
  assert.doesNotMatch(p, /本平台收款/);
});
