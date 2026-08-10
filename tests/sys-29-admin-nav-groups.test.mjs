import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MANAGEMENT_MENU_CATALOG,
  MENU_GROUP_LABELS,
  PLATFORM_MENU_CATALOG,
  filterMenuCatalog,
  groupMenuItems,
} from '../packages/contracts/dist/index.js';

test('SYS-29: Management menu groups into operate/commerce/people/intents', () => {
  const items = filterMenuCatalog(MANAGEMENT_MENU_CATALOG, [
    'tenant.manage',
    'organization.manage',
  ]);
  const groups = groupMenuItems(items);
  assert.deepEqual(
    groups.map((group) => group.key),
    ['operate', 'commerce', 'people', 'intents'],
  );
  assert.equal(groups[0]?.label, MENU_GROUP_LABELS.operate);
  assert.ok(items.every((item) => item.group));
});

test('SYS-29: store-manager chrome keeps operate+commerce groups only', () => {
  const groups = groupMenuItems(filterMenuCatalog(MANAGEMENT_MENU_CATALOG, ['tenant.read']));
  assert.deepEqual(
    groups.map((group) => group.key),
    ['operate', 'commerce'],
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
