import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const page = () => readFileSync(join(root, 'apps/management-web/app/m/offers/page.tsx'), 'utf8');
const css = () =>
  readFileSync(join(root, 'apps/management-web/app/m/offers/page.module.css'), 'utf8');

test('W∞-39: management offers has Meituan merchant PC yellow top bar', () => {
  const p = page();
  const c = css();
  assert.match(p, /topBar/);
  assert.match(p, /推广员工具 · 商品\/套餐入口/);
  assert.match(c, /#ffd100|#ffe14d/);
  assert.match(c, /background:\s*#f5f5f5/);
});

test('W∞-39: management offers gray canvas + white panels/cards', () => {
  const p = page();
  const c = css();
  assert.match(p, /className=\{styles\.panel\}/);
  assert.match(p, /className=\{styles\.service\}/);
  assert.match(p, /heroCard/);
  assert.match(c, /\.panel \{/);
  assert.match(c, /\.service \{/);
  assert.doesNotMatch(p, /AdminPageHeader/);
  assert.doesNotMatch(p, /<Card/);
});

test('W∞-39: management offers honest entry boundaries preserved', () => {
  const p = page();
  assert.match(p, /也不在此售卖下单/);
  assert.match(p, /不宣称第三方实时同步/);
  assert.match(p, /商户后台登记/);
  assert.match(p, /非本平台下单/);
  assert.doesNotMatch(p, /商品管理/);
});
