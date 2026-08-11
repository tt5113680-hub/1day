import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('G1-W∞-14: service detail + store profile densify (MH5-12/06)', () => {
  const root = process.cwd();
  const service = readFileSync(
    join(root, 'apps/consumer-web/app/c/services/[id]/service.tsx'),
    'utf8',
  );
  const channel = readFileSync(
    join(root, 'apps/consumer-web/app/c/stores/[id]/channel.tsx'),
    'utf8',
  );

  assert.match(service, /推广员工具 · 套餐详情/);
  assert.match(service, /不在此下单/);
  assert.match(service, /确认前往/);
  assert.match(service, /外链须知/);
  assert.match(service, /非本平台下单/);
  assert.match(service, /service_group_buy/);
  assert.doesNotMatch(service, /去购买/);
  assert.doesNotMatch(service, /去\$\{platformLabel/);
  assert.doesNotMatch(service, /购买须知/);
  assert.doesNotMatch(service, /下单前请阅读/);

  assert.match(channel, /channel === 'profile'/);
  assert.match(channel, /推广员工具 · 会员证明与外链入口/);
  assert.match(channel, /非本平台下单/);
  assert.match(channel, /profile_tab_membership/);
  assert.match(channel, /「我的」仅展示本店会员证明/);
});
