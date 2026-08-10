import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MANAGEMENT_MENU_CATALOG,
  filterMenuCatalog,
} from '../packages/contracts/dist/index.js';

test('SYS-23: Management attribution is discoverable in menu catalog for tenant.manage', () => {
  const item = MANAGEMENT_MENU_CATALOG.find((entry) => entry.key === 'attribution');
  assert.ok(item, 'attribution catalog entry missing');
  assert.equal(item.href, '/m/attribution');
  assert.equal(item.label, '来源归因');
  assert.deepEqual(item.requireAny, ['tenant.manage']);

  const managerKeys = filterMenuCatalog(MANAGEMENT_MENU_CATALOG, ['tenant.manage']).map(
    (entry) => entry.key,
  );
  assert.ok(managerKeys.includes('attribution'));
  assert.ok(managerKeys.indexOf('attribution') > managerKeys.indexOf('customers'));

  const storeManagerKeys = filterMenuCatalog(MANAGEMENT_MENU_CATALOG, ['tenant.read']).map(
    (entry) => entry.key,
  );
  assert.ok(!storeManagerKeys.includes('attribution'));

  const readerKeys = filterMenuCatalog(MANAGEMENT_MENU_CATALOG, ['customer.read']).map(
    (entry) => entry.key,
  );
  assert.ok(!readerKeys.includes('attribution'));
});
