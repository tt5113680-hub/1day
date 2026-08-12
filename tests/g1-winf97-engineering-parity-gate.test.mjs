import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const honest =
  /非本平台下单|不代替平台成交|不在此下单|不包含本平台收款|不代履约美团|source=local|本地试点记录未接美团实时|未接美团实时|保留审批和审计记录|不伪造第三方|本平台成交/;

const engineeringSurfaces = [
  ['management dashboard', 'apps/management-web/app/page.tsx'],
  ['management stores', 'apps/management-web/app/m/stores/page.tsx'],
  ['management offers', 'apps/management-web/app/m/offers/page.tsx'],
  ['management orders', 'apps/management-web/app/m/orders/page.tsx'],
  ['management reviews', 'apps/management-web/app/m/reviews/page.tsx'],
  ['management customers', 'apps/management-web/app/m/customers/page.tsx'],
  ['management memberships', 'apps/management-web/app/m/memberships/page.tsx'],
  ['management marketing', 'apps/management-web/app/m/marketing/page.tsx'],
  ['management analytics', 'apps/management-web/app/m/analytics/page.tsx'],
  ['management employees', 'apps/management-web/app/m/organization-employees/page.tsx'],
  ['management roles', 'apps/management-web/app/m/roles-permissions/page.tsx'],
  ['management page-builder', 'apps/management-web/app/m/page-builder/page.tsx'],
  ['management content', 'apps/management-web/app/m/content/page.tsx'],
  ['management settings', 'apps/management-web/app/m/settings/page.tsx'],
  ['management notifications', 'apps/management-web/app/m/notifications/page.tsx'],
  ['employee workbench', 'apps/employee-web/app/e/workbench/workbench.tsx'],
  ['employee tasks', 'apps/employee-web/app/e/tasks/task-inbox.tsx'],
  ['employee customers', 'apps/employee-web/app/e/customers/customer-directory.tsx'],
  ['employee nurture', 'apps/employee-web/app/e/nurture/nurture-workbench.tsx'],
  ['employee store', 'apps/employee-web/app/e/store/store-home.tsx'],
  ['employee memberships', 'apps/employee-web/app/e/memberships/membership-redeem.tsx'],
  ['employee notifications', 'apps/employee-web/app/e/notifications/notification-center.tsx'],
  ['employee profile', 'apps/employee-web/app/e/profile/employee-profile.tsx'],
  ['employee share', 'apps/employee-web/app/e/share/share-codes.tsx'],
  ['consumer discovery', 'apps/consumer-web/app/c/discovery/discovery.tsx'],
  ['consumer store', 'apps/consumer-web/app/c/stores/[id]/store.tsx'],
  ['consumer entry', 'apps/consumer-web/app/c/entry/consumer-entry.tsx'],
  ['consumer circles', 'apps/consumer-web/app/c/circles/circles-home.tsx'],
  ['platform dashboard', 'apps/platform-web/app/p/dashboard/page.tsx'],
  ['platform tenants', 'apps/platform-web/app/p/tenants/page.tsx'],
  ['platform channels', 'apps/platform-web/app/p/channels/page.tsx'],
  ['channel dashboard', 'apps/platform-web/app/ch/dashboard/page.tsx'],
];

test('G1-W∞-97: inventory PARTIAL surfaces have engineering parity chrome (tool mark + summary/hero + honest)', () => {
  for (const [name, file] of engineeringSurfaces) {
    const page = read(file);
    assert.ok(
      /styles\.topBar|className=\{styles\.topBar\}|推广员工具 ·/.test(page),
      `${name} should expose tool-identity chrome`,
    );
    assert.match(
      page,
      /summaryStrip|heroCard/,
      `${name} should render summaryStrip or heroCard`,
    );
    assert.match(page, honest, `${name} should keep honest boundary`);
    assert.doesNotMatch(
      page,
      /import \{[^}]*\bAdminPageHeader\b/,
      `${name} should not import AdminPageHeader`,
    );
  }
});

test('G1-W∞-97: inventory documents engineering-vs-commercial PARITY gate', () => {
  const inventory = read('PROJECT_STATE/MEITUAN_PC_H5_PARITY_INVENTORY.md');
  assert.match(inventory, /工程对标 PASS/);
  assert.match(inventory, /31 个 PARTIAL/);
  assert.match(inventory, /PRODUCT_OWNER_UI_ACCEPTANCE/);
});
