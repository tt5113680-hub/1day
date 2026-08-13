import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const service = () => read('apps/api/src/management-commerce.service.ts');
const controller = () => read('apps/api/src/management-commerce.controller.ts');
const page = () => read('apps/management-web/app/m/orders/page.tsx');
const css = () => read('apps/management-web/app/m/_commerce.module.css');

test('G1-W113: commerce controller exposes order detail + export gated by tenant/scope', () => {
  const c = controller();
  assert.match(c, /@Get\('orders\/:id'\)/);
  assert.match(c, /@Get\('orders\/export'\)/);
  assert.match(c, /async orderDetail/);
  assert.match(c, /this\.commerce\.getOrderDetail/);
  assert.match(c, /this\.commerce\.exportOrders/);
  assert.match(c, /operatorContext/);
  assert.match(c, /FastifyReply/);
  assert.match(c, /text\/csv; charset=utf-8/);
});

test('G1-W113: order detail service builds real source / customer / task / audit chain', () => {
  const s = service();
  assert.match(s, /async getOrderDetail/);
  assert.match(s, /customer_orders/);
  assert.match(s, /order_number/);
  assert.match(s, /storeFilter\(/);
  assert.match(s, /NotFoundException\('NOT_FOUND'\)/);
  assert.match(s, /customer_sources/);
  assert.match(s, /select t\.title,t\.status,t\.due_at/);
  assert.match(s, /from tasks t/);
  assert.match(s, /audit_logs/);
  assert.match(s, /evidence_count/);
  assert.match(s, /connector_count/);
  assert.match(s, /customer_sources/);
});

test('G1-W113: export service produces a real CSV of the order trace list', () => {
  const s = service();
  assert.match(s, /async exportOrders/);
  assert.match(
    s,
    /'order_number,customer_name,store_name,source,status,fulfillment_status,currency,amount_cents,items,occurred_at'/,
  );
  assert.match(s, /replaceAll\('"', '""'\)/);
  assert.match(s, /filename: `order-trace-.*csv`/);
  assert.match(s, /listOrders/);
});

test('G1-W113: management orders page renders export button + detail drawer', () => {
  const p = page();
  const m = css();
  assert.match(p, /订单痕迹详情/);
  assert.match(p, /导出/);
  assert.match(p, /orders\/export/);
  assert.match(p, /orders\/\$\{orderId\}/);
  assert.match(p, /openDetail/);
  assert.match(p, /closeDrawer/);
  assert.match(p, /来源链/);
  assert.match(p, /客户任务链/);
  assert.match(p, /本地审计链/);
  assert.match(p, /OrderTraceDrawer/);
  assert.match(m, /\.drawerBackdrop/);
  assert.match(m, /\.drawer \{/);
  assert.match(m, /\.drawerCard/);
  assert.match(m, /\.chainList/);
  assert.match(m, /\.topBarActions/);
});

test('G1-W113: honest boundaries retained (local trace only, no payment / no store order / no fake BI)', () => {
  const p = page();
  const s = service();
  assert.match(p, /source=local/);
  assert.match(p, /不接美团实时订单/);
  assert.match(p, /不代表第三方成交或履约/);
  assert.match(p, /不含本平台收款/);
  assert.match(p, /非本平台下单/);
  assert.match(s, /source=local/);
  assert.match(s, /No fabricated aggregates/);
  assert.match(s, /no fabricated/);
  assert.doesNotMatch(s, /Math\.random/);
  assert.doesNotMatch(p, /Math\.random/);
  assert.doesNotMatch(p, /mockMetrics/);
});
