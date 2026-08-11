import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const customers = () => read('apps/management-web/app/m/customers/page.tsx');
const customersCss = () => read('apps/management-web/app/m/customers/page.module.css');
const memberships = () => read('apps/management-web/app/m/memberships/page.tsx');
const membershipsCss = () => read('apps/management-web/app/m/memberships/page.module.css');

test('G1-W∞-46: customers adds real-data 分层/归属/标签 distribution panel', () => {
  assert.match(customers(), /aria-label="客户跟进分布"/);
  assert.doesNotMatch(customers(), /AdminPageHeader/);
  // real-data buckets computed from fetched rows
  assert.match(customers(), /segmentCounts\.set/);
  assert.match(customers(), /ownerCounts\.set/);
  assert.match(customers(), /tagCounts\.set/);
  for (const label of ['分层分布', '归属分布', '标签分布']) {
    assert.match(customers(), new RegExp(`<h2>${label}</h2>`));
  }
  // share bars are real-data driven (not hard-coded percentages)
  assert.match(customers(), /customers\.length \? \(b\.value \/ customers\.length\)/);
  assert.match(customers(), /暂无记录/);
  assert.match(customers(), /暂无标签/);
});

test('G1-W∞-46: memberships adds real-data 门店/入会时间 distribution panel', () => {
  assert.match(memberships(), /aria-label="会员分布"/);
  assert.match(memberships(), /storeCounts\.set/);
  assert.match(memberships(), /joinCounts\.set/);
  assert.match(memberships(), /<h2>门店分布<\/h2>/);
  assert.match(memberships(), /<h2>入会时间分布<\/h2>/);
  assert.match(memberships(), /enrollments\.length \? \(b\.value \/ enrollments\.length\)/);
  assert.match(memberships(), /暂无记录/);
});

test('G1-W∞-46: customers panel/bar CSS present + responsive stacking', () => {
  assert.match(customersCss(), /\.panel\s*\{/);
  assert.match(customersCss(), /\.panelBlock\s*\{/);
  assert.match(customersCss(), /\.barFill\s*\{/);
  assert.match(customersCss(), /\.barTrack\s*\{/);
  assert.match(customersCss(), /\.barRow\s*\{/);
  assert.match(customersCss(), /\.barEmpty\s*\{/);
  assert.match(customersCss(), /\.panel\s*\{\s*grid-template-columns:\s*1fr;\s*\}/);
  assert.match(customersCss(), /\.barFill\s*\{\s*display:\s*block;/);
  assert.match(customersCss(), /background:\s*linear-gradient\(90deg,\s*#ffd100,\s*#f0a500\);/);
});

test('G1-W∞-46: memberships panel/bar CSS present + responsive stacking', () => {
  assert.match(membershipsCss(), /\.panel\s*\{/);
  assert.match(membershipsCss(), /\.panelBlock\s*\{/);
  assert.match(membershipsCss(), /\.barFill\s*\{/);
  assert.match(membershipsCss(), /\.barRow\s*\{/);
  assert.match(membershipsCss(), /\.barEmpty\s*\{/);
  // panel rests inside the existing 900px media query to stack to 1fr
  assert.match(membershipsCss(), /\.panel\s*\{\s*grid-template-columns:\s*1fr;\s*\}/);
});

test('G1-W∞-46: honest no-native-checkout boundary + e2e hooks retained', () => {
  const customersSrc = customers();
  const membershipsSrc = memberships();
  // customers tool identity + e2e hooks
  assert.match(customersSrc, /推广员工具 · 客户跟进/);
  assert.match(customersSrc, /申请导出/);
  assert.match(customersSrc, /实名授权跟进|来源与分层组织推广跟进作业/);
  assert.match(membershipsSrc, /推广员工具 · 会员中心/);
  assert.match(membershipsSrc, /data-testid="management-memberships"/);
  assert.match(membershipsSrc, /不伪造第三方投放或本平台成交/);
  assert.match(membershipsSrc, /member_benefit_ledger/);
});
