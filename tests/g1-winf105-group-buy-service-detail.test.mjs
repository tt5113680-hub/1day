import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');

function mustInclude(path, needle, label) {
  const text = readFileSync(join(root, path), 'utf8');
  assert.ok(text.includes(needle), `${label}: missing ${needle} in ${path}`);
}

mustInclude(
  'apps/consumer-web/app/c/stores/[id]/storefront-modules.tsx',
  'storefront_group_buy_detail',
  'storefront offer compare detail link',
);
mustInclude(
  'apps/consumer-web/app/c/stores/[id]/storefront-modules.tsx',
  '/c/services/${offer.serviceId}',
  'banner group buy service detail',
);
mustInclude(
  'apps/consumer-web/app/c/stores/[id]/channel.tsx',
  'group_buy_offer_detail',
  'group-buy channel service detail',
);
mustInclude(
  'apps/consumer-web/app/c/stores/[id]/channel.tsx',
  '查看套餐详情',
  'group-buy detail copy',
);
mustInclude(
  'apps/consumer-web/app/c/services/[id]/service.tsx',
  '团购套餐详情',
  'service page group-buy title',
);
mustInclude(
  'packages/storefront-renderer/src/paint.tsx',
  'detailHref',
  'compare package detail href',
);

console.log('g1-winf105-group-buy-service-detail: 6/6 PASS');
