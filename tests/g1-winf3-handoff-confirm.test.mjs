import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('G1-W∞-3: external hand-off confirm densify (no native checkout)', () => {
  const root = process.cwd();
  const action = readFileSync(
    join(root, 'apps/consumer-web/app/c/actions/[id]/action.tsx'),
    'utf8',
  );
  assert.match(action, /jump_confirm/);
  assert.match(action, /surfaceFromScene/);
  assert.match(action, /不表示第三方已下单或已支付/);
  assert.match(action, /destinationHost/);
  assert.match(action, /确认前往/);
  assert.doesNotMatch(action, /consumer_orders/);
  assert.doesNotMatch(action, /创建订单/);

  const store = readFileSync(join(root, 'apps/consumer-web/app/c/stores/[id]/store.tsx'), 'utf8');
  assert.match(store, /\/c\/actions\/\$\{actionId\}/);

  const modules = readFileSync(
    join(root, 'apps/consumer-web/app/c/stores/[id]/storefront-modules.tsx'),
    'utf8',
  );
  assert.match(modules, /actionUrl\(item\.id/);
});
