import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('G1-W∞-13: menu + store home densify (MH5-05/03)', () => {
  const root = process.cwd();
  const channel = readFileSync(
    join(root, 'apps/consumer-web/app/c/stores/[id]/channel.tsx'),
    'utf8',
  );
  const store = readFileSync(
    join(root, 'apps/consumer-web/app/c/stores/[id]/store.tsx'),
    'utf8',
  );

  assert.match(channel, /推广员工具 · 门店套餐说明/);
  assert.match(channel, /菜单频道展示门店已发布套餐说明/);
  assert.match(channel, /不在此下单/);
  assert.match(channel, /menu_group_buy/);
  assert.match(channel, /本页不含支付金额/);

  assert.match(store, /推广员工具 · 商家入口页/);
  assert.match(store, /不在此下单/);
  assert.match(store, /merchantToolNote/);
  assert.doesNotMatch(store, /美团 App · 商家页/);
});
