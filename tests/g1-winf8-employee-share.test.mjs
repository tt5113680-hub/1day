import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('G1-W∞-8: employee share tool densify', () => {
  const root = process.cwd();
  const page = readFileSync(join(root, 'apps/employee-web/app/e/share/share-codes.tsx'), 'utf8');
  assert.match(page, /推广员工具/);
  assert.match(page, /分享配对/);
  assert.match(page, /不含第三方成交结果|不含支付或第三方订单结果/);
  assert.match(page, /employee\/share-codes/);
});
