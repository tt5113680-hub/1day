import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const rp = () => read('apps/management-web/app/m/roles-permissions/page.tsx');
const rpCss = () => read('apps/management-web/app/m/roles-permissions/page.module.css');

test('G1-W∞-49: roles-permissions adds real-data 角色权限分布 panel', () => {
  assert.match(rp(), /aria-label="角色权限分布"/);
  assert.doesNotMatch(rp(), /AdminPageHeader/);
  // real-data buckets computed from fetched role/permission rows
  assert.match(rp(), /memberCounts\.set/);
  assert.match(rp(), /scaleCounts\.set/);
  assert.match(rp(), /permissionCounts\.set/);
  assert.match(rp(), /sensitiveCounts\.set/);
  for (const label of ['成员负载分布', '权限规模分布', '权限项分布', '高风险权限持有分布']) {
    assert.match(rp(), new RegExp(`<h2>${label}</h2>`));
  }
  // share bars are real-data driven (not hard-coded percentages)
  assert.match(rp(), /rolesTotal \? \(b\.value \/ rolesTotal\) \* 100/);
  assert.match(rp(), /permissionTotal \? \(b\.value \/ permissionTotal\) \* 100/);
  assert.match(rp(), /sensitiveTotal \? \(b\.value \/ sensitiveTotal\) \* 100/);
  // bucket labels derived from real member_count / permissions.length
  assert.match(rp(), /无成员/);
  assert.match(rp(), /轻量 1-5/);
  assert.match(rp(), /活跃 6\+/);
  assert.match(rp(), /基础 1-5/);
  assert.match(rp(), /中等 6-10/);
  assert.match(rp(), /全量 11\+/);
  assert.match(rp(), /暂无记录/);
  // honest no-native-checkout / no-third-party-live boundary retained
  assert.match(rp(), /非本平台下单/);
});

test('G1-W∞-49: keeps create/roles IA + summaryStrip + honest boundary intact', () => {
  assert.match(rp(), /推广员工具 · 角色权限/);
  assert.match(rp(), /<h1>在变更前看清权限范围与成员影响<\/h1>/);
  assert.match(rp(), /summaryStrip/);
  assert.match(rp(), /高风险权限必须二次确认/);
  assert.match(rp(), /推广员工具权限/);
  assert.match(rp(), /data-testid="management-roles-permissions"/);
  assert.match(rp(), /创建角色/);
  assert.match(rp(), /查看与变更/);
  assert.match(rp(), /确认权限变更/);
});

test('G1-W∞-49: roles-permissions distribution/bar CSS present + responsive stacking', () => {
  assert.match(rpCss(), /\.distribution\s*\{/);
  assert.match(rpCss(), /\.panelBlock\s*\{/);
  assert.match(rpCss(), /\.barFill\s*\{/);
  assert.match(rpCss(), /\.barTrack\s*\{/);
  assert.match(rpCss(), /\.barRow\s*\{/);
  assert.match(rpCss(), /\.barValue\s*\{/);
  assert.match(rpCss(), /\.barEmpty\s*\{/);
  assert.match(rpCss(), /\.distribution\s*\{\s*grid-template-columns:\s*1fr;\s*\}/);
  assert.match(rpCss(), /\.barFill\s*\{\s*display:\s*block;/);
  assert.match(rpCss(), /background:\s*linear-gradient\(90deg,\s*#ffd100,\s*#f0a500\);/);
});

test('G1-W∞-49: honest source=local disclaimer and real-data derivations present', () => {
  assert.match(rp(), /source=local/);
  assert.match(rp(), /不接美团\/抖音实时人事或绩效/);
  assert.match(rp(), /byMember/);
  assert.match(rp(), /byScale/);
  assert.match(rp(), /byPermission/);
  assert.match(rp(), /bySensitive/);
});
