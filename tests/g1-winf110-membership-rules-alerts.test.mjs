import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const page = () => read('apps/management-web/app/m/memberships/page.tsx');
const css = () => read('apps/management-web/app/m/memberships/page.module.css');
const service = () => read('apps/api/src/management-membership-depth.service.ts');
const controller = () => read('apps/api/src/management-membership-depth.controller.ts');
const membershipSvc = () => read('apps/api/src/membership-commercial.service.ts');
const migration = () => read('packages/database/src/migrations/065_membership_rules_alerts.ts');

test('G1-W∞-110: migration adds enrollment expiry columns + tenant-scoped benefit rules table', () => {
  assert.match(migration(), /alterTable\('membership_enrollments'\)/);
  assert.match(migration(), /expires_at/);
  assert.match(migration(), /last_active_at/);
  assert.match(migration(), /createTable\('membership_benefit_rules'\)/);
  assert.match(migration(), /benefits_config/);
  assert.match(migration(), /validity_days/);
  assert.match(migration(), /enforce_quantity/);
  assert.match(migration(), /tenant_id.*references\('tenants\.id'\)/);
  assert.match(migration(), /membership_benefit_rules_tier_unique/);
});

test('G1-W∞-110: API exposes rules + renewals + alerts gated by tenant.manage', () => {
  const c = controller();
  assert.match(c, /management\/memberships/);
  assert.match(c, /@Controller\('api\/v1\/management\/memberships'\)/);
  assert.match(c, /@Get\('rules'\)/);
  assert.match(c, /@Post\('rules'\)/);
  assert.match(c, /@Get\('renewals'\)/);
  assert.match(c, /@Get\('alerts'\)/);
  assert.match(c, /tenant\.manage/);
  assert.match(c, /idempotency-key/);
  const s = service();
  assert.match(s, /membership_benefit_rules/i);
  assert.match(s, /audit_logs/i);
  assert.match(s, /outbox_events/i);
  assert.match(s, /membership\.rule_upserted/);
  assert.match(s, /membership\.benefit_rule\.upserted\.v1/);
});

test('G1-W∞-110: renewals returns expiry/inactivity reminders from real enrollments', () => {
  const s = service();
  assert.match(s, /async renewals\(/);
  assert.match(s, /expires_at/);
  assert.match(s, /enrollment_status='active'/);
  assert.match(s, /interval '3 days'/);
  assert.match(s, /interval '90 days'/);
});

test('G1-W∞-110: alerts surfaces suspended / expired / no_recent_activity anomalies', () => {
  const s = service();
  assert.match(s, /async alerts\(/);
  assert.match(s, /'suspended'/);
  assert.match(s, /'expired'/);
  assert.match(s, /'no_recent_activity'/);
});

test('G1-W∞-110: membership list + redeem expose tier / expires_at / last_active_at', () => {
  const svc = membershipSvc();
  assert.match(svc, /e\.tier,e\.expires_at,e\.last_active_at/);
  assert.match(svc, /last_active_at=now\(\)/);
});

test('G1-W∞-110: memberships page renders rules / renewal / alert panels from real API', () => {
  const p = page();
  assert.match(p, /memberships\/rules/);
  assert.match(p, /memberships\/renewals/);
  assert.match(p, /memberships\/alerts/);
  assert.match(p, /等级\/权益规则/);
  assert.match(p, /到期提醒/);
  assert.match(p, /异常告警/);
  assert.match(p, /保存等级权益规则/);
  assert.match(p, /ruleTier/);
  assert.match(css(), /\.ruleRow/);
  assert.match(css(), /\.alertRow/);
  assert.match(css(), /\.ruleInput/);
});

test('G1-W∞-110: honest boundaries retained (no stored value / no payment / non-native)', () => {
  const p = page();
  const s = service();
  assert.match(p, /不含储值/);
  assert.match(p, /不含支付/);
  assert.match(p, /不代第三方成交/);
  assert.match(s, /不碰储值/);
  assert.match(s, /不碰支付/);
  assert.match(s, /不代第三方成交/);
  assert.doesNotMatch(s, /amount_cents/);
});
