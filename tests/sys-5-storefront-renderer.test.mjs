import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  buildStorefrontRenderPlan,
  visibleStorefrontModules,
} from '../packages/storefront-renderer/dist/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('SYS-5 scaffold: shared package wired into Consumer and Management', () => {
  const consumerPkg = JSON.parse(
    readFileSync(join(root, 'apps/consumer-web/package.json'), 'utf8'),
  );
  const managementPkg = JSON.parse(
    readFileSync(join(root, 'apps/management-web/package.json'), 'utf8'),
  );
  const foundation = readFileSync(join(root, 'packages/design-tokens/foundation.css'), 'utf8');
  const consumerSource = readFileSync(
    join(root, 'apps/consumer-web/app/c/stores/[id]/storefront-modules.tsx'),
    'utf8',
  );
  const managementSource = readFileSync(
    join(root, 'apps/management-web/app/m/page-builder/page.tsx'),
    'utf8',
  );
  const uiIndex = readFileSync(join(root, 'packages/ui/src/index.ts'), 'utf8');

  assert.equal(consumerPkg.dependencies['@oneday/storefront-renderer'], 'workspace:*');
  assert.equal(managementPkg.dependencies['@oneday/storefront-renderer'], 'workspace:*');
  assert.match(foundation, /--od-brand-50:\s*#f3f8f4/);
  assert.match(consumerSource, /@oneday\/storefront-renderer/);
  assert.match(consumerSource, /visibleStorefrontModules/);
  assert.match(managementSource, /StorefrontModuleOutline/);
  assert.match(managementSource, /@oneday\/storefront-renderer/);
  assert.match(uiIndex, /designTokens/);
  assert.match(uiIndex, /FormField/);

  const modules = [
    { id: '2', module_type: 'service_catalog', position: 2, config: {} },
    { id: '1', module_type: 'banner_carousel', position: 1, config: { visible: false } },
    { id: '3', module_type: 'content_feed', position: 3, config: {} },
  ];
  assert.deepEqual(
    visibleStorefrontModules(modules).map((item) => item.id),
    ['2', '3'],
  );
  const plan = buildStorefrontRenderPlan(modules);
  assert.equal(plan.length, 1);
  assert.equal(plan[0]?.kind, 'section-batch');
});
