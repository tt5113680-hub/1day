import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const page = () => read('apps/employee-web/app/e/memberships/membership-redeem.tsx');
const css = () => read('apps/employee-web/app/e/memberships/membership-redeem.module.css');
const apiService = () => read('apps/api/src/membership-commercial.service.ts');
const apiController = () => read('apps/api/src/membership-commercial.controller.ts');

test('W∞-67: employee membership redeem has Meituan merchant sticky yellow top bar', () => {
  const p = page();
  const c = css();
  assert.match(p, /推广员工具 · 会员核销/);
  assert.match(p, /className=\{styles\.topBar\}/);
  assert.match(c, /background:\s*linear-gradient\(180deg,\s*#ffe14d/);
  assert.match(c, /background:\s*#f5f5f5/);
  assert.match(p, /className=\{styles\.heroCard\}/);
  assert.match(p, /<h1>会员权益核销<\/h1>/);
});

test('W∞-67: employee membership redeem keeps the redeem form and adds real-data distribution panel', () => {
  const p = page();
  assert.match(p, /确认核销/);
  assert.match(p, /会员码/);
  assert.match(p, /aria-label="会员核销概况"/);
  assert.match(p, /aria-label="会员核销分布"/);
  assert.match(p, /权益动作分布/);
  assert.match(p, /权益项分布/);
  assert.match(p, /门店分布/);
  assert.match(p, /行为月份分布/);
  assert.match(p, /会员状态分布/);
  assert.match(p, /summaryStrip/);
  assert.match(css(), /#ffd100.*#f0a500|#f0a500/);
});

test('W∞-67: employee membership distributions derive from ledger/enrollment rows', () => {
  const p = page();
  assert.match(p, /countBy\(ledger\.map/);
  assert.match(p, /entryLabel\(row\.entryType\)/);
  assert.match(p, /row\.benefitTitle \?\? '未标注权益'/);
  assert.match(p, /row\.storeName \?\? '未归属门店'/);
  assert.match(p, /monthLabel\(row\.createdAt\)/);
  assert.match(p, /statusLabel\(row\.enrollmentStatus\)/);
  assert.match(p, /barWidth\(total,\s*item\.value\)/);
  assert.match(p, /total=\{ledger\.length\}/);
  assert.match(p, /total=\{enrollments\.length\}/);
  assert.match(p, /\/api\/v1\/employee\/memberships\/overview/);
});

test('W∞-67: employee membership overview API is scoped and reads real rows', () => {
  const s = apiService();
  const c = apiController();
  assert.match(c, /employee\/memberships\/overview/);
  assert.match(c, /employeeContext\(a, t, r, 'task\.read'\)/);
  assert.match(s, /member_benefit_ledger l/);
  assert.match(s, /membership_enrollments e/);
  assert.match(s, /store_benefits b/);
  assert.match(s, /resolveStoreScopes\(/);
  assert.match(s, /\$2::uuid\[\]/);
});

test('W∞-67: honest employee membership boundaries preserved', () => {
  const p = page();
  assert.match(p, /source=local/);
  assert.match(p, /不替代美团\/抖音会员/);
  assert.match(p, /不代履约美团\/抖音订单/);
  assert.match(p, /非本平台下单/);
  assert.doesNotMatch(p, /本平台收款|本平台下单.*成功态|支付金额.*成功/);
});
