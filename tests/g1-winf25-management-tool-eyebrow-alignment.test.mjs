import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const pages = {
  page_builder: 'apps/management-web/app/m/page-builder/page.tsx',
  content: 'apps/management-web/app/m/content/page.tsx',
  funnels: 'apps/management-web/app/m/funnels/[id]/page.tsx',
  roles: 'apps/management-web/app/m/roles-permissions/page.tsx',
  permission_audit: 'apps/management-web/app/m/permission-audit/page.tsx',
  settings: 'apps/management-web/app/m/settings/page.tsx',
  connectors: 'apps/management-web/app/m/connectors/page.tsx',
  org_employees: 'apps/management-web/app/m/organization-employees/page.tsx',
  ai_suggestions: 'apps/management-web/app/m/ai-suggestions/page.tsx',
  workflows: 'apps/management-web/app/m/workflows/page.tsx',
  memberships: 'apps/management-web/app/m/memberships/page.tsx',
  employee_perf: 'apps/management-web/app/m/employee-process-performance/page.tsx',
  external_actions: 'apps/management-web/app/m/external-actions/page.tsx',
  attribution: 'apps/management-web/app/m/attribution/page.tsx',
};
const src = Object.fromEntries(Object.entries(pages).map(([k, rel]) => [k, () => read(rel)]));

test('W∞-25: Management page eyebrows align to the promotion-tool identity (no merchant store-ops framing)', () => {
  assert.match(src.funnels(), /topBarTitle}>推广员工具 · 来源归因漏斗<\/span>/);
  assert.doesNotMatch(src.funnels(), /eyebrow="推广员工具 · 来源归因漏斗"/);
  assert.match(src.permission_audit(), /topBarTitle}>推广员工具 · 操作审计<\/span>/);
  assert.doesNotMatch(src.permission_audit(), /eyebrow="推广员工具 · 操作审计"/);
  assert.match(src.connectors(), /topBarTitle}>推广员工具 · 连接配置<\/span>/);
  assert.doesNotMatch(src.connectors(), /eyebrow="推广员工具 · 连接配置"/);
  assert.match(src.ai_suggestions(), /topBarTitle}>推广员工具 · 作业建议<\/span>/);
  assert.doesNotMatch(src.ai_suggestions(), /eyebrow="推广员工具 · 作业建议"/);
  assert.match(src.workflows(), /eyebrow="推广员工具 · 工作流整合"/);
  assert.match(src.employee_perf(), /topBarTitle}>推广员工具 · 员工表现<\/span>/);
  assert.doesNotMatch(src.employee_perf(), /eyebrow="推广员工具 · 员工表现"/);
  assert.match(src.external_actions(), /topBarTitle}>推广员工具 · 外链服务<\/span>/);
  assert.doesNotMatch(src.external_actions(), /eyebrow="推广员工具 · 外链服务"/);
});

test('W∞-25: funnels/[id] states + title reframed from 经营漏斗 to 来源归因漏斗', () => {
  const f = src.funnels();
  assert.match(f, /<h1>从来源到进店承接，跟踪每一步的入口分流<\/h1>/);
  assert.match(f, /正在汇总来源归因漏斗/);
  assert.match(f, /无法查看来源归因漏斗/);
  assert.match(f, /来源归因漏斗暂不可用/);
  assert.match(f, /当作入口分流结果/);
  assert.doesNotMatch(f, /商户经营漏斗/);
  assert.doesNotMatch(f, /经营漏斗/);
  assert.doesNotMatch(f, /经营结果/);
});

test('W∞-25: ai-suggestions reframes 经营判断 overclaim to entry-trace interpretation', () => {
  const a = src.ai_suggestions();
  assert.match(a, /<h1>把入口痕迹解读成可确认的下一步<\/h1>/);
  assert.doesNotMatch(a, /把经营判断变成可确认的下一步/);
});

test('W∞-25: attribution hints use entry-funnel wording (no leftover 入口经营链路)', () => {
  const at = src.attribution();
  assert.match(at, /等待新的入口分流链路形成/);
  assert.match(at, /不是销售漏斗成交阶段/);
  assert.doesNotMatch(at, /入口经营链路/);
  assert.doesNotMatch(at, /初次进入经营链路/);
  assert.doesNotMatch(at, /经营证据/);
  assert.doesNotMatch(at, /经营承接/);
});

test('W∞-25: no management page retains the legacy 商户经营 eyebrow framing', () => {
  for (const rel of Object.values(pages)) {
    const content = read(rel);
    assert.doesNotMatch(content, /eyebrow="ONEDAY \/ 商户经营/);
    assert.doesNotMatch(
      content,
      /eyebrow="ONEDAY \/ 商户角色|eyebrow="ONEDAY \/ 商户连接器|eyebrow="ONEDAY \/ 商户组织|eyebrow="ONEDAY \/ 商户内容|eyebrow="ONEDAY \/ 商户运营流程|eyebrow="ONEDAY \/ 平台安全 · 商户权限审计/,
    );
    assert.doesNotMatch(content, /eyebrow="ONEDAY \/ 数字门店装修与发布/);
    assert.doesNotMatch(content, /eyebrow="ONEDAY \/ MEMBER OPERATIONS/);
  }
});
