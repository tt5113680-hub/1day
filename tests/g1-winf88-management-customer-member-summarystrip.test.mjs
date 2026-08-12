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

test('G1-W∞-88: /m/customers adds Meituan-parity summaryStrip overview bar', () => {
  assert.match(customers(), /data-testid="management-customers"/);
  assert.match(customers(), /aria-label="客户数据概况"/);
  assert.match(customers(), /className=\{styles\.summaryStrip\}/);
  assert.match(customers(), /<span>客户<\/span>/);
});

test('G1-W∞-88: /m/customers summaryStrip values are real-data derived from customer fields', () => {
  assert.match(customers(), /customers\.length/);
  assert.match(customers(), /activeCount/);
  assert.match(customers(), /repurchaseCount/);
  assert.match(customers(), /dormantCount/);
  assert.match(customers(), /byTag\.length/);
  assert.match(customers(), /orderedCount/);
});

test('G1-W∞-88: /m/customers summaryStrip CSS present with responsive stacking', () => {
  assert.match(customersCss(), /\.summaryStrip\s*\{/);
  assert.match(customersCss(), /grid-template-columns:\s*repeat\(6,\s*minmax\(0,\s*1fr\)\);/);
  assert.match(
    customersCss(),
    /@media \(max-width: 900px\)[\s\S]*\.summaryStrip\s*\{\s*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/,
  );
});

test('G1-W∞-88: /m/memberships upgrades to full-parity summaryStrip overview bar', () => {
  assert.match(memberships(), /data-testid="management-memberships"/);
  assert.match(memberships(), /aria-label="会员数据概况"/);
  assert.match(memberships(), /className=\{styles\.summaryStrip\}/);
  assert.match(memberships(), /<span>在册会员<\/span>/);
  assert.match(memberships(), /<span>权益项<\/span>/);
  assert.match(memberships(), /<span>覆盖门店<\/span>/);
  assert.doesNotMatch(memberships(), /className=\{styles\.summary\}/);
});

test('G1-W∞-88: /m/memberships summaryStrip values are real-data derived from membership fields', () => {
  assert.match(memberships(), /enrolledCount/);
  assert.match(memberships(), /benefitCount/);
  assert.match(memberships(), /coveredStores\.size/);
  assert.match(memberships(), /enrollments\.length/);
  assert.match(memberships(), /data\.benefits\.length/);
});

test('G1-W∞-88: /m/memberships summaryStrip CSS present with responsive stacking', () => {
  assert.match(membershipsCss(), /\.summaryStrip\s*\{/);
  assert.match(membershipsCss(), /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/);
  assert.match(
    membershipsCss(),
    /@media \(max-width: 900px\)[\s\S]*\.summaryStrip\s*\{\s*grid-template-columns:\s*1fr 1fr;/,
  );
  assert.doesNotMatch(membershipsCss(), /\.summary\s*\{/);
});

test('G1-W∞-88: customers + memberships keep distribution panels + honest no-native-checkout boundary', () => {
  assert.match(customers(), /aria-label="客户跟进分布"/);
  assert.match(customers(), /推广员工具 · 客户跟进/);
  assert.match(memberships(), /aria-label="会员分布"/);
  assert.match(memberships(), /推广员工具 · 会员中心/);
  for (const src of [customers(), memberships()]) {
    assert.doesNotMatch(src, /AdminPageHeader/);
    assert.doesNotMatch(src, /eyebrow=/);
  }
  // honest no-native-checkout boundaries retained on both pages
  assert.match(customers(), /审批和审计记录|保留审批和审计记录/);
  assert.match(memberships(), /不伪造第三方投放或本平台成交/);
});
