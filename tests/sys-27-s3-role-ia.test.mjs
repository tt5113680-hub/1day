import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PLATFORM_PRODUCT_HOMES,
  STORE_MANAGER_MENU_ITEM,
  STORE_MANAGER_PACKAGE_ACTIONS,
  resolveAvailableProducts,
} from '../packages/contracts/dist/index.js';

test('SYS-27: store-manager package deep-links existing Employee routes only', () => {
  assert.equal(STORE_MANAGER_MENU_ITEM.href, '/e/store');
  assert.deepEqual(
    STORE_MANAGER_PACKAGE_ACTIONS.map((item) => ({ key: item.key, href: item.href })),
    [
      { key: 'tasks', href: '/e/tasks' },
      { key: 'leads', href: '/e/leads' },
      { key: 'redeem', href: '/e/workbench#membership-redeem' },
      { key: 'share', href: '/e/share' },
    ],
  );
  for (const action of STORE_MANAGER_PACKAGE_ACTIONS) {
    assert.ok(action.href.startsWith('/e/'), `${action.key} must stay on Employee`);
  }
});

test('SYS-27: platform product homes cover platform/channel/circle switcher targets', () => {
  assert.equal(PLATFORM_PRODUCT_HOMES.platform.homeHref, '/p/dashboard');
  assert.equal(PLATFORM_PRODUCT_HOMES.channel.homeHref, '/ch/dashboard');
  assert.equal(PLATFORM_PRODUCT_HOMES.circle.homeHref, '/bc/dashboard');

  const available = resolveAvailableProducts(['platform.read', 'platform.manage']);
  assert.deepEqual(
    available
      .filter((item) => ['platform', 'channel', 'circle'].includes(item.product))
      .map((item) => item.homeHref),
    ['/p/dashboard', '/ch/dashboard', '/bc/dashboard'],
  );
});
