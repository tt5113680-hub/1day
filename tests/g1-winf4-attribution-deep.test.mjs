import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('G1-W∞-4: Management attribution deep page (tool path)', () => {
  const root = process.cwd();
  const page = readFileSync(join(root, 'apps/management-web/app/m/attribution/page.tsx'), 'utf8');
  assert.match(page, /推广员工具/);
  assert.match(page, /\/m\/entry-funnel/);
  assert.match(page, /来源类型/);
  assert.match(page, /不表示第三方已下单或已支付/);
  assert.match(page, /不是销售漏斗成交阶段/);
  assert.doesNotMatch(page, /成交额/);

  const funnel = readFileSync(
    join(root, 'apps/management-web/app/m/entry-funnel/page.tsx'),
    'utf8',
  );
  assert.match(funnel, /\/m\/attribution/);
});
