import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const kpi = () => read('apps/employee-web/app/e/employee-workbench-kpi.tsx');

test('W∞-101: employee shared KPI fetches workbench stats (同源)', () => {
  assert.match(kpi(), /employee\/workbench/);
  assert.match(kpi(), /allOpenTasks/);
  assert.match(kpi(), /shareOpensToday/);
  assert.match(kpi(), /redemptionsToday/);
  assert.match(kpi(), /data-testid="employee-workbench-kpi"/);
  assert.match(kpi(), /不含 GMV\/第三方履约/);
  assert.doesNotMatch(kpi(), /假 BI|mockMetrics|Math\.random\(/);
});

test('W∞-101: employee deep pages embed shared KPI + workbench cross-nav', () => {
  const share = read('apps/employee-web/app/e/share/share-codes.tsx');
  const leads = read('apps/employee-web/app/e/leads/lead-pool.tsx');
  const nurture = read('apps/employee-web/app/e/nurture/nurture-workbench.tsx');
  const memberships = read('apps/employee-web/app/e/memberships/membership-redeem.tsx');
  const workbench = read('apps/employee-web/app/e/workbench/workbench.tsx');
  for (const [name, src, page] of [
    ['share', share, 'share'],
    ['leads', leads, 'leads'],
    ['nurture', nurture, 'nurture'],
    ['memberships', memberships, 'memberships'],
  ]) {
    assert.match(src, /EmployeeWorkbenchKpi/, `${name} missing KPI`);
    assert.match(src, new RegExp(`page="${page}"`), `${name} page id`);
  }
  assert.match(workbench, /EmployeeDeepPageNav/);
  assert.match(workbench, /EmployeeWorkbenchKpiStrip/);
  assert.match(workbench, /page="workbench"/);
  assert.match(kpi(), /employeeWorkbenchKpiItems/);
  assert.match(kpi(), /已认领线索/);
  assert.match(kpi(), /活跃分享码/);
});
