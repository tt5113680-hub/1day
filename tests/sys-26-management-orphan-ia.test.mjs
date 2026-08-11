import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MANAGEMENT_MENU_CATALOG,
  filterMenuCatalog,
} from '../packages/contracts/dist/index.js';

const orphans = [
  {
    key: 'employee-performance',
    href: '/m/employee-process-performance',
    label: '员工表现',
  },
  { key: 'ai-suggestions', href: '/m/ai-suggestions', label: '作业建议' },
  { key: 'connectors', href: '/m/connectors', label: '连接配置' },
  { key: 'permission-audit', href: '/m/permission-audit', label: '操作审计' },
];

test('SYS-26: former Management orphan pages are discoverable in menu catalog', () => {
  for (const orphan of orphans) {
    const item = MANAGEMENT_MENU_CATALOG.find((entry) => entry.key === orphan.key);
    assert.ok(item, `${orphan.key} missing`);
    assert.equal(item.href, orphan.href);
    assert.equal(item.label, orphan.label);
    assert.deepEqual(item.requireAny, ['tenant.manage']);
  }

  const managerKeys = filterMenuCatalog(MANAGEMENT_MENU_CATALOG, ['tenant.manage']).map(
    (item) => item.key,
  );
  for (const orphan of orphans) {
    assert.ok(managerKeys.includes(orphan.key), `${orphan.key} hidden from tenant.manage`);
  }

  const storeManagerKeys = filterMenuCatalog(MANAGEMENT_MENU_CATALOG, ['tenant.read']).map(
    (item) => item.key,
  );
  for (const orphan of orphans) {
    assert.ok(!storeManagerKeys.includes(orphan.key), `${orphan.key} leaked to tenant.read`);
  }
});
