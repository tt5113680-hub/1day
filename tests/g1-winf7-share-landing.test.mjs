import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('G1-W∞-7: share landing densify (MH5-11)', () => {
  const root = process.cwd();
  const page = readFileSync(
    join(root, 'apps/consumer-web/app/c/share/[code]/share-landing.tsx'),
    'utf8',
  );
  assert.match(page, /share_open/);
  assert.match(page, /AppStatePanel/);
  assert.match(page, /不表示第三方已成交/);
  assert.match(page, /source', 'employee:share'/);
  assert.match(page, /scene', 'share_landing'/);
  assert.doesNotMatch(page, /支付成功|订单履约|成交额/);
});
