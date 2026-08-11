import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('G1-W∞-12: group-buy + membership densify (MH5-04/10)', () => {
  const root = process.cwd();
  const channel = readFileSync(
    join(root, 'apps/consumer-web/app/c/stores/[id]/channel.tsx'),
    'utf8',
  );
  const settings = readFileSync(
    join(root, 'apps/management-web/app/m/settings/page.tsx'),
    'utf8',
  );

  assert.match(channel, /推广员工具 · 比价聚合/);
  assert.match(channel, /不在此下单/);
  assert.match(channel, /外链比价/);
  assert.match(channel, /platformLegend/);
  assert.match(channel, /本店会员 · 推广员工具/);
  assert.match(channel, /不含支付金额/);
  assert.match(channel, /不替代美团\/抖音\/扫呗会员/);
  assert.doesNotMatch(channel, /(?<!非)本平台下单/);

  assert.match(settings, /推广员工具 · 经营设置/);
  assert.match(settings, /\/m\/entry-funnel/);
  assert.match(settings, /\/m\/attribution/);
  assert.match(settings, /不含支付金额与第三方订单成功/);
});
