import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const dash = () => read('apps/management-web/app/page.tsx');
const portal = () => read('apps/management-web/app/m/management-home-modules.tsx');
const row = () => read('apps/management-web/app/m/management-queue-row.tsx');
const css = () => read('apps/management-web/app/page.module.css');
const service = () => read('apps/api/src/management-dashboard.service.ts');
const dispositionService = () => read('apps/api/src/management-queue-disposition.service.ts');
const dispositionController = () => read('apps/api/src/management-queue-disposition.controller.ts');
const migration = () =>
  read('packages/database/src/migrations/062_management_queue_disposition.ts');

test('G1-W∞-107: disposition migration creates tenant-scoped queue disposition table', () => {
  assert.match(migration(), /createTable\('management_queue_dispositions'\)/);
  assert.match(migration(), /queue_type/);
  assert.match(migration(), /source_id/);
  assert.match(migration(), /status/);
  assert.match(migration(), /tenant_id.*references\('tenants\.id'\)/);
});

test('G1-W∞-107: API exposes disposition write endpoint gated by tenant.manage', () => {
  const controller = dispositionController();
  assert.match(controller, /dispositions/);
  assert.match(controller, /auth\.require\(a, 'tenant\.manage', t\)/);
  assert.match(controller, /idempotency-key/);
  const svc = dispositionService();
  assert.match(svc, /idempotency_keys/i);
  assert.match(svc, /audit_logs/i);
  assert.match(svc, /outbox_events/i);
});

test('G1-W∞-107: dashboard surfaces disposition status + actionable rate (real DB, no GMV)', () => {
  const s = service();
  assert.match(s, /withDisposition\('/);
  assert.match(s, /queue_type, source_id, status[\s\S]*management_queue_dispositions/);
  assert.match(s, /dispositionSummary/);
  assert.match(s, /handledRate/);
  assert.match(s, /pending/);
});

test('G1-W∞-107: workbench UI adds one-click dispose (deep-link + handled/ignored) + rate strip', () => {
  const page = dash();
  assert.match(page, /早会队列处置/);
  assert.match(page, /处置率/);
  assert.match(page, /disposition\.handled/);
  assert.match(page, /disposition\.pending/);
  assert.match(page, /\/dispositions/);
  assert.match(page, /data-testid="management-dashboard"/);
  // both render paths get the disposition panel
  assert.match(portal(), /早会队列处置/);
  assert.match(portal(), /dispose=\{dispose\}/);
  // shared row renders deep link + handled/ignored buttons
  const r = row();
  assert.match(r, /打开/);
  assert.match(r, /已处理/);
  assert.match(r, /忽略/);
  assert.match(css(), /\.queueRow/);
  assert.match(css(), /\.queueButton/);
  assert.match(css(), /\.rateStrip/);
});

test('G1-W∞-107: honest boundaries retained (no GMV, non-native/third-party order fulfillment)', () => {
  const page = dash();
  assert.match(page, /source=local/);
  assert.match(page, /非本平台下单/);
  assert.match(page, /不含支付金额/);
  assert.doesNotMatch(page, /已成交/);
  assert.doesNotMatch(page, /AdminPageHeader/);
});

console.log('g1-winf107-workbench-queue-disposition: 5/5 PASS');
