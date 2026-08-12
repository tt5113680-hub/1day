import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const page = () =>
  readFileSync(join(root, 'apps/consumer-web/app/c/stores/[id]/store.tsx'), 'utf8');
const css = () =>
  readFileSync(join(root, 'apps/consumer-web/app/c/stores/[id]/store.module.css'), 'utf8');

test('W∞-33: store page chrome is Meituan store-top-bar (back + store name + search pill)', () => {
  const p = page();
  const c = css();
  assert.match(p, /storeTopBar/);
  assert.match(p, /返回附近门店/);
  assert.match(p, /storeSearchPill/);
  assert.match(p, /\/c\/discovery\?tenant=/);
  assert.match(p, /\/c\/search\?tenant=/);
  assert.match(c, /position:\s*sticky/);
  assert.match(c, /var\(--od-brand-700\)/);
  assert.doesNotMatch(c, /#[0-9a-fA-F]{3,8}\b/);
});

test('W∞-33: store identity + actions row (导航/电话/分享) + open state', () => {
  const p = page();
  const c = css();
  assert.match(p, /storeHeader/);
  assert.match(p, /storeCover/);
  assert.match(p, /营业中/);
  assert.match(p, />导航</);
  assert.match(p, />电话</);
  assert.match(p, />分享</);
  assert.match(c, /object-fit:\s*cover/);
});

test('W∞-33: sticky section sub-tabs anchor onto storefront modules', () => {
  const p = page();
  const c = css();
  assert.match(p, /storeSubTabs/);
  assert.match(p, /anchor: item\.id/);
  assert.match(p, /sectionHub/);
  assert.match(p, /effectiveStorefrontModules/);
  assert.match(c, /\.storeSubTabs \{/);
  assert.match(c, /top:\s*46px/);
});

test('W∞-33: honest commercial boundaries preserved on store page', () => {
  const p = page();
  assert.match(p, /推广员工具 · 商家入口页/);
  assert.match(p, /不在此下单/);
  assert.match(p, /merchantToolNote/);
  assert.doesNotMatch(p, /美团 App · 商家页/);
  assert.match(p, /非本平台下单/);
});
