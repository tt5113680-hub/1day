import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const mg = (p) => read(`apps/management-web/app/${p}`);
const emp = (p) => read(`apps/employee-web/app/${p}`);

test('W∞-27: Management pages align forbidden/state copy to promoter-tool identity (no 经营管理 permission)', () => {
  const workflows = mg('m/workflows/page.tsx');
  const attribution = mg('m/attribution/page.tsx');
  const orgEmp = mg('m/organization-employees/page.tsx');
  const aiSugg = mg('m/ai-suggestions/page.tsx');
  const epp = mg('m/employee-process-performance/page.tsx');
  const permAudit = mg('m/permission-audit/page.tsx');
  const roles = mg('m/roles-permissions/page.tsx');
  [workflows, attribution, orgEmp, aiSugg, epp, permAudit, roles].forEach((s) => {
    assert.match(s, /请使用具备推广员工具权限的账号。/);
  });
  assert.doesNotMatch(workflows, /经营管理/);
  assert.doesNotMatch(roles, /经营管理/);
});

test('W∞-27: tenant-scoped pages align to 推广员工具 (entry-funnel, circles)', () => {
  assert.match(mg('m/entry-funnel/page.tsx'), /请使用具备租户推广员工具权限的账号。/);
  assert.match(mg('m/circles/page.tsx'), /请使用具备租户推广员工具权限的账号。/);
});

test('W∞-27: permission-list pages align to 推广员工具授权 (memberships, external-actions)', () => {
  assert.match(mg('m/memberships/page.tsx'), /需要推广员工具授权或门店范围的 tenant\.read。/);
  assert.match(mg('m/external-actions/page.tsx'), /需要推广员工具授权或 action\.read \/ action\.manage 权限。/);
});

test('W∞-27: stores / roles / content / page-builder / ai-suggestions state copy aligned', () => {
  assert.match(mg('m/stores/page.tsx'), /请使用具备推广员工具权限的账号登录。/);
  assert.match(mg('m/roles-permissions/page.tsx'), /请确认编码唯一且具备工具授权。/);
  assert.match(mg('m/content/page.tsx'), /请使用具备内容工具权限的账号。/);
  assert.match(mg('m/page-builder/page.tsx'), /请使用具备模板工具权限的账号。/);
  assert.match(mg('m/ai-suggestions/page.tsx'), /正在校验建议来源、执行状态与工具授权。/);
});

test('W∞-27: Management global fallback / loading / error use 推广员工具 identity', () => {
  assert.match(mg('forbidden/page.tsx'), /当前角色没有工具访问权限/);
  assert.match(mg('forbidden/page.tsx'), /请返回推广员工具工作台/);
  assert.match(mg('loading.tsx'), /title="正在整理工具数据"/);
  assert.match(mg('loading.tsx'), /工具信息。/);
  assert.match(mg('error.tsx'), /title="工具数据暂时不可用"/);
  assert.match(mg('error.tsx'), /已完成的工具操作不会被重复提交。/);
  assert.match(mg('page.tsx'), /desc: '门店入口'/);
});

test('W∞-27: Employee redeem note aligned to promoter-tool identity', () => {
  const redeem = emp('e/memberships/membership-redeem.tsx');
  assert.match(redeem, /当前没有可核销权益；请先由推广员工具授权的账号发放门店权益。/);
  assert.doesNotMatch(redeem, /经营管理/);
});

test('W∞-27: no management/employee store-ops 经营管理 remains in App TSX', () => {
  const targets = [
    'm/workflows/page.tsx',
    'm/attribution/page.tsx',
    'm/organization-employees/page.tsx',
    'm/ai-suggestions/page.tsx',
    'm/employee-process-performance/page.tsx',
    'm/permission-audit/page.tsx',
    'm/entry-funnel/page.tsx',
    'm/circles/page.tsx',
    'm/memberships/page.tsx',
    'm/external-actions/page.tsx',
    'm/stores/page.tsx',
    'm/roles-permissions/page.tsx',
    'm/content/page.tsx',
    'm/page-builder/page.tsx',
    'forbidden/page.tsx',
    'loading.tsx',
    'error.tsx',
  ];
  targets.forEach((p) => assert.doesNotMatch(mg(p), /经营管理/, `${p} should not reference 经营管理`));
  assert.doesNotMatch(read('apps/api/src/management-dashboard.service.ts'), /客户资产/);
});
