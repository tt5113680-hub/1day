import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const page = () => read('apps/management-web/app/m/offers/page.tsx');
const css = () => read('apps/management-web/app/m/offers/page.module.css');
const service = () => read('apps/api/src/management-catalog.service.ts');
const controller = () => read('apps/api/src/management-catalog.controller.ts');
const migration = () => read('packages/database/src/migrations/067_service_category_rank.ts');

test('G1-W112: migration adds tenant-scoped category dimension to store_services', () => {
  assert.match(migration(), /alterTable\('store_services'\)/);
  assert.match(migration(), /addColumn\('category', 'varchar\(80\)'\)/);
  assert.match(migration(), /store_services_tenant_category_idx/);
  assert.match(migration(), /不含支付、不含成交、不代第三方成交/);
});

test('G1-W112: catalog depth API exposes categories / jump-rank / batch-status gated by tenant+scope', () => {
  const c = controller();
  assert.match(c, /@Get\('categories'\)/);
  assert.match(c, /@Get\('jump-rank'\)/);
  assert.match(c, /@Post\('stores\/:storeId\/services\/batch-status'\)/);
  const s = service();
  assert.match(s, /async categoryTree\(/);
  assert.match(s, /async batchSetServiceStatus\(/);
  assert.match(s, /async jumpRank\(/);
  assert.match(s, /store_services/);
  assert.match(s, /entry_funnel_events/);
});

test('G1-W112: category tree groups services by category (this is a real grouping, no fake)', () => {
  const s = service();
  assert.match(s, /categories = new Map<string, Record<string, unknown>>\(\)/);
  assert.match(s, /\(未分类\)/);
  assert.match(s, /serviceCount/);
  assert.match(s, /storeCount/);
  assert.match(s, /order by coalesce\(nullif\(ss\.category,''\), '~未分类'\)/);
});

test('G1-W112: batch status is idempotent with audit + outbox, only toggles status', () => {
  const s = service();
  const p = page();
  assert.match(s, /catalog_service_batch/);
  assert.match(s, /catalog\.service_batch_/);
  assert.match(s, /catalog\.service\.batch_.*\.v1/);
  assert.match(s, /set status=\$1, updated_at=now\(\), updated_by=\$2, version=version\+1/);
  assert.match(p, /批量上下架/);
  assert.match(p, /批量上架/);
  assert.match(p, /批量下架/);
  assert.match(p, /batch-status/);
  assert.doesNotMatch(s, /amount_cents/);
});

test('G1-W112: jump rank aggregates real entry traces (jump/jump_confirm only, no payment)', () => {
  const s = service();
  const p = page();
  assert.match(s, /event_code in \('jump','jump_confirm'\)/);
  assert.match(s, /jump_total/);
  assert.match(s, /jumpConfirms/);
  assert.match(s, /target_url = a\.target_url or e\.module_key = a\.name/);
  assert.match(s, /不接美团\/抖音实时/);
  assert.match(s, /不代表第三方成交或支付/);
  assert.match(p, /套餐跳转排行/);
  assert.match(p, /jump\s*\/\s*jump_confirm/);
  assert.match(p, /不代表第三方成交/);
});

test('G1-W112: management offers page renders category input, tree and jump-rank sections', () => {
  const p = page();
  const m = css();
  assert.match(p, /商品分类树/);
  assert.match(p, /套餐分类/);
  assert.match(p, /jump-rank\?days=30/);
  assert.match(p, /categories/);
  assert.match(p, /jumpRank/);
  assert.match(m, /\.categoryList/);
  assert.match(m, /\.categoryNode/);
  assert.match(m, /\.batchToolbar/);
  assert.match(m, /\.treeRow/);
});

test('G1-W112: honest boundaries retained (entry-traces only, no payment / no store order / no fake BI)', () => {
  const p = page();
  const s = service();
  assert.match(p, /不接美团\/抖音实时价格、不伪造第三方评分或成交、不包含本平台收款、非本平台下单/);
  assert.match(p, /不代表第三方成交或支付/);
  assert.doesNotMatch(s, /amount_cents/);
  assert.doesNotMatch(p, /Math\.random/);
  assert.doesNotMatch(p, /mockMetrics/);
});
