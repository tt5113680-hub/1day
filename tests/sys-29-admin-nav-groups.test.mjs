import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MANAGEMENT_MENU_CATALOG,
  MENU_GROUP_LABELS,
  PLATFORM_MENU_CATALOG,
  filterMenuCatalog,
  groupMenuItems,
} from '../packages/contracts/dist/index.js';

test('SYS-29 / G1-W1: Management menu groups follow Meituan merchant-PC IA', () => {
  const items = filterMenuCatalog(MANAGEMENT_MENU_CATALOG, [
    'tenant.manage',
    'organization.manage',
  ]);
  const groups = groupMenuItems(items);
  assert.deepEqual(
    groups.map((group) => group.key),
    ['workbench', 'store', 'goods', 'customer', 'marketing', 'staff', 'settings', 'workflow'],
  );
  assert.equal(groups[0]?.label, MENU_GROUP_LABELS.workbench);
  assert.equal(groups.at(-1)?.label, MENU_GROUP_LABELS.workflow);
  assert.ok(items.every((item) => item.group));
});

test('SYS-29 / G1-W1: store-manager chrome keeps workbench+store+goods+marketing', () => {
  const groups = groupMenuItems(filterMenuCatalog(MANAGEMENT_MENU_CATALOG, ['tenant.read']));
  assert.deepEqual(
    groups.map((group) => group.key),
    ['workbench', 'store', 'goods', 'marketing'],
  );
  assert.deepEqual(
    groups.flatMap((group) => group.items.map((item) => item.key)),
    ['overview', 'stores', 'offers', 'memberships', 'content'],
  );
});

test('SYS-29: Platform catalog groups into govern/network/intents', () => {
  const groups = groupMenuItems(
    filterMenuCatalog(PLATFORM_MENU_CATALOG, ['platform.read', 'platform.manage']),
  );
  assert.deepEqual(
    groups.map((group) => group.key),
    ['govern', 'network', 'intents'],
  );
});
