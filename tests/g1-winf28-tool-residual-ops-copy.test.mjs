import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const mg = (p) => read(`apps/management-web/app/${p}`);
const emp = (p) => read(`apps/employee-web/app/${p}`);

test('W∞-28: Management 404 fallback frames the tenant tool, not store-ops 经营', () => {
  const notFound = mg('not-found.tsx');
  assert.match(notFound, /没有找到工具页面/);
  assert.match(notFound, /推广员工具功能/);
  assert.doesNotMatch(notFound, /经营/);
});

test('W∞-28: /m/attribution drops store-ops 经营 wording (入口 link, not sales funnel)', () => {
  const attribution = mg('m/attribution/page.tsx');
  assert.match(attribution, /正在关联入口来源、员工贡献与入口证据（不含第三方成交）。/);
  assert.match(attribution, /归因阶段描述入口分流与承接，不是销售漏斗成交阶段/);
  assert.doesNotMatch(attribution, /经营证据/);
  assert.doesNotMatch(attribution, /经营承接/);
});

test('W∞-28: /m/ai-suggestions empty-talk is entry-signal (not 经营异常)', () => {
  const aiSugg = mg('m/ai-suggestions/page.tsx');
  assert.match(aiSugg, /当入口异常或可优化信号进入系统后，建议会在此处出现。/);
  assert.doesNotMatch(aiSugg, /经营异常/);
});

test('W∞-28: /m/page-builder entry-channel legend aligned to 入口 (not 经营频道)', () => {
  const pb = mg('m/page-builder/page.tsx');
  assert.match(pb, /入口频道（最多 3 个）/);
  assert.doesNotMatch(pb, /经营频道/);
});

test('W∞-28: /m/offers default price source is merchant-registered, not 经营后台', () => {
  const offers = mg('m/offers/page.tsx');
  assert.match(offers, /priceSource: draft\.priceSource \|\| '商户后台登记',/);
  assert.doesNotMatch(offers, /商户经营后台登记/);
});

test('W∞-28: tenant permission labels are tool-scoped (查看/管理租户工具), not store-ops 经营', () => {
  const rolesMg = mg('m/roles-permissions/page.tsx');
  const profileEmp = emp('e/profile/employee-profile.tsx');
  assert.match(rolesMg, /'tenant\.read': '查看租户工具',/);
  assert.match(rolesMg, /'tenant\.manage': '管理租户工具',/);
  assert.match(profileEmp, /'tenant\.manage': '管理租户工具',/);
  assert.match(profileEmp, /'tenant\.read': '查看租户工具',/);
  assert.doesNotMatch(rolesMg, /管理租户经营/);
  assert.doesNotMatch(profileEmp, /查看租户经营/);
});

test('W∞-28: /m/customers/[id] follow-up anomaly is 跟进异常, not 经营异常', () => {
  const detail = mg('m/customers/[id]/page.tsx');
  assert.match(detail, /aria-label="跟进异常"/);
  assert.doesNotMatch(detail, /经营异常/);
});

test('W∞-28: Employee global loading is a promotion-tool workbench (not 经营工作台)', () => {
  const loading = emp('loading.tsx');
  assert.match(loading, /title="正在准备推广员工具工作台"/);
  assert.doesNotMatch(loading, /经营/);
});

test('W∞-28: Employee nurture failure is a follow-up queue (not 客户经营队列)', () => {
  const nurture = emp('e/nurture/nurture-workbench.tsx');
  assert.match(nurture, /客户跟进队列未能完成加载。/);
  assert.doesNotMatch(nurture, /经营/);
});

test('W∞-28: Employee notifications sync tool reminders (not 经营提醒)', () => {
  const notif = emp('e/notifications/notification-center.tsx');
  assert.match(notif, /正在同步当前员工的任务与工具提醒。/);
  assert.doesNotMatch(notif, /经营/);
});

test('W∞-28: Employee share codes lead to the tool/consumer entry (not 经营入口)', () => {
  const share = emp('e/share/share-codes.tsx');
  assert.match(share, /后续扫码不会进入工具入口。/);
  assert.match(share, /默认进入消费者入口，可选设置自动失效时间。/);
  assert.doesNotMatch(share, /经营入口/);
});

test('W∞-28: Employee store-manager page is a store entry (门店入口), not 门店经营', () => {
  const storeHome = emp('e/store/store-home.tsx');
  assert.match(storeHome, /门店入口首页/);
  assert.match(storeHome, /店长入口能力需要门店任命后才会出现。/);
  assert.match(storeHome, /aria-label="店长入口能力包"/);
  assert.doesNotMatch(storeHome, /门店经营首页/);
  assert.doesNotMatch(storeHome, /店长经营能力/);
});

test('W∞-28: Employee surface leaf has no 经营 store-ops residuals', () => {
  const targets = [
    'loading.tsx',
    'e/nurture/nurture-workbench.tsx',
    'e/notifications/notification-center.tsx',
    'e/share/share-codes.tsx',
    'e/store/store-home.tsx',
    'e/profile/employee-profile.tsx',
  ];
  targets.forEach((p) => assert.doesNotMatch(emp(p), /经营/, `${p} should not reference 经营`));
});

test('W∞-28: Management tool-identity list has no 经营 residuals (circles 商圈 network identity preserved apart)', () => {
  const targets = [
    'not-found.tsx',
    'm/attribution/page.tsx',
    'm/ai-suggestions/page.tsx',
    'm/page-builder/page.tsx',
    'm/offers/page.tsx',
    'm/roles-permissions/page.tsx',
    'm/customers/[id]/page.tsx',
  ];
  targets.forEach((p) => assert.doesNotMatch(mg(p), /经营/, `${p} should not reference 经营`));
});

test('W∞-28: test fixtures / assertions use tool-identity 商户后台登记 (no store-ops 商户经营后台登记)', () => {
  const offerOps = read('tests/batch-2-offer-operations.test.mjs');
  const matrixG = read('tests/matrix-mg-g-depth.test.mjs');
  assert.doesNotMatch(offerOps, /商户经营后台登记/);
  assert.doesNotMatch(matrixG, /商户经营后台登记/);
  assert.match(offerOps, /商户后台登记/);
  assert.match(matrixG, /商户后台登记/);
});
