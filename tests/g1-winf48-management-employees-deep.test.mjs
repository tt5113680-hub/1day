import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const org = () => read('apps/management-web/app/m/organization-employees/page.tsx');
const orgCss = () => read('apps/management-web/app/m/organization-employees/page.module.css');

test('G1-W∞-48: organization-employees adds real-data 员工分布 distribution panel', () => {
  assert.match(org(), /aria-label="员工分布"/);
  assert.doesNotMatch(org(), /AdminPageHeader/);
  // real-data buckets computed from fetched organization/employee/invitation rows
  assert.match(org(), /employeeStatusCounts\.set/);
  assert.match(org(), /organizationCounts\.set/);
  assert.match(org(), /loadCounts\.set/);
  assert.match(org(), /customerCounts\.set/);
  assert.match(org(), /invitationCounts\.set/);
  for (const label of [
    '员工状态分布',
    '组织员工分布',
    '待办负载分布',
    '客户负载分布',
    '待接受邀请分布',
  ]) {
    assert.match(org(), new RegExp(`<h2>${label}</h2>`));
  }
  // share bars are real-data driven (not hard-coded percentages)
  assert.match(org(), /data\.employees\.length \? \(b\.value \/ data\.employees\.length\)/);
  assert.match(org(), /data\.invitations\.length \? \(b\.value \/ data\.invitations\.length\)/);
  // load/customer bucket labels are derived from real open_task_count / active_customer_count
  assert.match(org(), /无待办/);
  assert.match(org(), /轻负载 1-5/);
  assert.match(org(), /重负载 6\+/);
  assert.match(org(), /大量客户 11\+/);
  assert.match(org(), /暂无记录/);
  // honest no-native-checkout / no-third-party-live boundary retained
  assert.match(org(), /非本平台下单/);
});

test('G1-W∞-48: keeps create/invite/offboard IA + summaryStrip + honest boundary intact', () => {
  assert.match(org(), /推广员工具 · 员工管理/);
  assert.match(org(), /<h1>让每位员工的归属、待办与离职交接可见<\/h1>/);
  assert.match(org(), /summaryStrip/);
  assert.match(org(), /不另造第二套\s*API/);
  assert.match(org(), /租户工具授权范围/);
  assert.match(org(), /data-testid="management-organization-employees"/);
  assert.match(org(), /办理离职/);
  assert.match(org(), /员工与交接风险/);
  assert.match(org(), /创建组织/);
  assert.match(org(), /创建邀请/);
});

test('G1-W∞-48: employees distribution/bar CSS present + responsive stacking', () => {
  assert.match(orgCss(), /\.distribution\s*\{/);
  assert.match(orgCss(), /\.panelBlock\s*\{/);
  assert.match(orgCss(), /\.barFill\s*\{/);
  assert.match(orgCss(), /\.barTrack\s*\{/);
  assert.match(orgCss(), /\.barRow\s*\{/);
  assert.match(orgCss(), /\.barValue\s*\{/);
  assert.match(orgCss(), /\.barEmpty\s*\{/);
  assert.match(orgCss(), /\.distribution\s*\{\s*grid-template-columns:\s*1fr;\s*\}/);
  assert.match(orgCss(), /\.barFill\s*\{\s*display:\s*block;/);
  assert.match(orgCss(), /background:\s*linear-gradient\(90deg,\s*#ffd100,\s*#f0a500\);/);
});

test('G1-W∞-48: honest source=local disclaimer and org/invitation grouping present', () => {
  assert.match(org(), /source=local/);
  assert.match(org(), /不接美团\/抖音实时人事或绩效/);
  assert.match(org(), /未归属组织/);
  assert.match(org(), /byInvitation/);
  assert.match(org(), /byOrganization/);
});
