import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('TOOL-PHASE-3: L2 module impression + industry templates', () => {
  const root = process.cwd();
  const client = readFileSync(join(root, 'apps/consumer-web/app/c/entry-funnel-client.ts'), 'utf8');
  assert.match(client, /observeModuleImpressions/);
  assert.match(client, /IntersectionObserver/);
  assert.match(client, /module_impression/);

  const modules = readFileSync(
    join(root, 'apps/consumer-web/app/c/stores/[id]/storefront-modules.tsx'),
    'utf8',
  );
  assert.match(modules, /observeModuleImpressions/);
  assert.match(modules, /consult_click/);

  const service = readFileSync(join(root, 'apps/api/src/entry-funnel.service.ts'), 'utf8');
  assert.match(service, /industryTemplates/);
  assert.match(service, /buildRestaurantInsights/);
  assert.match(service, /不编造成交/);

  const page = readFileSync(join(root, 'apps/management-web/app/m/entry-funnel/page.tsx'), 'utf8');
  assert.match(page, /行业模板/);
  assert.match(page, /industryTemplates/);
  assert.match(page, /moduleImpressions/);
});
