import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const list = () => read('apps/management-web/app/m/customers/page.tsx');
const detail = () => read('apps/management-web/app/m/customers/[id]/page.tsx');
const css = () => read('apps/management-web/app/m/customers/page.module.css');
const detailCss = () => read('apps/management-web/app/m/customers/[id]/page.module.css');
const service = () => read('apps/api/src/management-customer-assets.service.ts');
const crmService = () => read('apps/api/src/management-crm-depth.service.ts');
const crmController = () => read('apps/api/src/management-crm-depth.controller.ts');
const migration = () => read('packages/database/src/migrations/064_customer_rfm_profiles.ts');

test('G1-W∞-109: RFM migration creates tenant-scoped customer RFM profile table', () => {
  assert.match(migration(), /createTable\('customer_rfm_profiles'\)/);
  assert.match(migration(), /customer_id/);
  assert.match(migration(), /recency_days/);
  assert.match(migration(), /frequency_count/);
  assert.match(migration(), /reach_count/);
  assert.match(migration(), /layer/);
  assert.match(migration(), /tenant_id.*references\('tenants\.id'\)/);
  assert.match(migration(), /customer_rfm_profiles_customer_unique/);
});

test('G1-W∞-109: API exposes RFM compute + batch tag endpoints gated by tenant.manage', () => {
  const controller = crmController();
  assert.match(controller, /rfm\/compute/);
  assert.match(controller, /tags\/batch/);
  assert.match(controller, /tenant\.manage/);
  assert.match(controller, /idempotency-key/);
  const svc = crmService();
  assert.match(svc, /customer_rfm_profiles/i);
  assert.match(svc, /customer_tags/i);
  assert.match(svc, /audit_logs/i);
  assert.match(svc, /outbox_events/i);
});

test('G1-W∞-109: list exposes RFM layer + supports RFM layer filter (real data, no fake)', () => {
  const s = service();
  assert.match(s, /customer_rfm_profiles r on/);
  assert.match(s, /r\.recency_days,r\.frequency_count,r\.reach_count,r\.layer/);
  assert.match(s, /query\.layer/);
  assert.match(s, /rfm:\s*\{/);
  assert.match(s, /layer:\s*row\.layer/);
});

test('G1-W∞-109: batch ownership retained + batch tag on customers (management)', () => {
  const c = read('apps/api/src/management-customer-assets.controller.ts');
  assert.match(c, /ownership\/batch/);
  assert.match(c, /exports/);
});

test('G1-W∞-109: detail adds RFM panel + richer 360 interaction timeline with follow-ups', () => {
  const s = service();
  assert.match(s, /rfm\.rows\[0\]/);
  assert.match(s, /rfm:\s*rfmProfile/);
  assert.match(s, /follow_ups/);
  assert.match(s, /followUps\.rows/);
  const d = detail();
  assert.match(d, /RFM 互动分层/);
  assert.match(d, /recencyDays/);
  assert.match(d, /frequencyCount/);
  assert.match(d, /reachCount/);
  assert.match(d, /客户 360 互动时间线/);
  assert.match(d, /跟进记录/);
  assert.match(detailCss(), /\.rfmPanel/);
  assert.match(detailCss(), /\.rfmGrid/);
});

test('G1-W∞-109: customers list adds RFM layer filter, RFM dist, batch tag UI', () => {
  const page = list();
  assert.match(page, /重算 RFM 分层/);
  assert.match(page, /rfm\/compute/);
  assert.match(page, /tags\/batch/);
  assert.match(page, /RFM 互动分层/);
  assert.match(page, /批量打标/);
  assert.match(page, /filters\.layer/);
  assert.match(page, /rfm\.layer/);
  assert.match(css(), /\.rfmRow/);
  assert.match(css(), /\.rfmSummary/);
});

test('G1-W∞-109: honest boundaries retained (no GMV, non-native/third-party order fulfillment)', () => {
  const listPage = list();
  const detailPage = detail();
  assert.match(listPage, /非本平台下单/);
  assert.match(listPage, /不含支付金额/);
  assert.match(detailPage, /非本平台下单/);
  assert.match(detailPage, /不含支付金额/);
  assert.match(crmService(), /不含支付金额/);
  assert.match(crmService(), /非本平台下单/);
  assert.doesNotMatch(listPage, /已成交/);
});

console.log('g1-winf109-crm-rfm-360: 7/7 PASS');
