import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const page = () => read('apps/management-web/app/m/stores/page.tsx');
const css = () => read('apps/management-web/app/m/stores/page.module.css');
const service = () => read('apps/api/src/management-store-depth.service.ts');
const controller = () => read('apps/api/src/management-store-depth.controller.ts');
const migration = () => read('packages/database/src/migrations/066_store_contact_qr.ts');

test('G1-W111: migration adds tenant-scoped store_contact_qr_codes registry', () => {
  assert.match(migration(), /createTable\('store_contact_qr_codes'\)/);
  assert.match(migration(), /tenant_id.*references\('tenants\.id'\)/);
  assert.match(migration(), /store_id.*references\('stores\.id'\)/);
  assert.match(migration(), /contact_type/);
  assert.match(migration(), /token/);
  assert.match(migration(), /target_path/);
  assert.match(migration(), /store_contact_qr_codes_store_type_unique/);
});

test('G1-W111: management store depth API exposes create / update / delete / qr-codes gated by tenant.manage', () => {
  const c = controller();
  assert.match(c, /management\/stores\/depth/);
  assert.match(c, /@Controller\('api\/v1\/management\/stores\/depth'\)/);
  assert.match(c, /@Post\(\)/);
  assert.match(c, /@Put\(':id'\)/);
  assert.match(c, /@Delete\(':id'\)/);
  assert.match(c, /@Get\(':id\/qr-codes'\)/);
  assert.match(c, /tenant\.manage/);
  assert.match(c, /idempotency-key/);
  const s = service();
  assert.match(s, /insert into stores/);
  assert.match(s, /update stores set /);
  assert.match(s, /deleted_at=now\(\),status='inactive'/);
  assert.match(s, /audit_logs/i);
  assert.match(s, /outbox_events/i);
  assert.match(s, /store\.created\.v1/);
  assert.match(s, /store\.updated\.v1/);
  assert.match(s, /store\.deleted\.v1/);
});

test('G1-W111: qr-codes upserts three contact-type groups (merchant / store / employee)', () => {
  const s = service();
  assert.match(s, /async qrCodes\(/);
  assert.match(s, /store_contact_qr_codes/i);
  assert.match(s, /'merchant'/);
  assert.match(s, /'store'/);
  assert.match(s, /'employee'/);
  assert.match(s, /contactType: 'merchant'/);
  assert.match(s, /contactType: 'store'/);
  assert.match(s, /contactType: 'employee'/);
  assert.match(s, /\/c\/entry\?surface=merchant-qr/);
  assert.match(s, /\/c\/stores\/\$\{storeId\}\?surface=store-qr/);
  assert.match(s, /surface=employee-qr/);
});

test('G1-W111: management stores page renders create form, edit/delete and three QR codes', () => {
  const p = page();
  const m = css();
  assert.match(p, /新建门店/);
  assert.match(p, /创建门店/);
  assert.match(p, /门店资料维护/);
  assert.match(p, /停用并移除/);
  assert.match(p, /三类触点二维码/);
  assert.match(p, /QRCode\.toDataURL/);
  assert.match(p, /qr-codes/);
  assert.match(p, /商户码/);
  assert.match(p, /门店码/);
  assert.match(p, /员工码/);
  assert.match(m, /\.qrGrid/);
  assert.match(m, /\.qrCard/);
  assert.match(m, /\.lineActions/);
  assert.match(m, /\.full/);
});

test('G1-W111: honest boundaries retained (entry/funnel only, no payment/store order)', () => {
  const p = page();
  const s = service();
  assert.match(p, /扫码分流入口/);
  assert.match(p, /不含本平台收款/);
  assert.match(p, /不建立自营订单/);
  assert.match(p, /按触点归因到入口痕迹/);
  assert.match(s, /不含收款/);
  assert.match(s, /不含支付/);
  assert.match(s, /不代第三方成交/);
  assert.match(s, /不建自营订单/);
  assert.doesNotMatch(s, /amount_cents/);
});
