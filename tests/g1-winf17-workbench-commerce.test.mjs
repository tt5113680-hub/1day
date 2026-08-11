import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('G1-W∞-17: workbench/leads/nurture + commerce + circle detail densify', () => {
  const root = process.cwd();
  const read = (rel) => readFileSync(join(root, rel), 'utf8');

  const workbench = read('apps/employee-web/app/e/workbench/workbench.tsx');
  const leads = read('apps/employee-web/app/e/leads/lead-pool.tsx');
  const nurture = read('apps/employee-web/app/e/nurture/nurture-workbench.tsx');
  const orders = read('apps/management-web/app/m/orders/page.tsx');
  const reviews = read('apps/management-web/app/m/reviews/page.tsx');
  const marketing = read('apps/management-web/app/m/marketing/page.tsx');
  const circle = read('apps/consumer-web/app/c/circles/[id]/circle-detail.tsx');

  assert.match(workbench, /推广员工具 · 工作台/);
  assert.match(workbench, /今日作业概览/);
  assert.doesNotMatch(workbench, /美团商家 · 工作台/);
  assert.doesNotMatch(workbench, /今日经营概览/);

  assert.match(leads, /推广员工具 · 获客池/);
  assert.match(leads, /不含支付金额/);

  assert.match(nurture, /推广员工具 · 客户跟进/);
  assert.match(nurture, /不碰销售成交/);
  assert.match(nurture, /回访机会/);
  assert.doesNotMatch(nurture, /复购机会/);
  assert.doesNotMatch(nurture, /把下一次复购/);

  assert.match(orders, /推广员工具 · 订单档案/);
  assert.match(orders, /非本平台下单/);
  assert.doesNotMatch(orders, /美团商家端 PC · 订单/);

  assert.match(reviews, /推广员工具 · 评价档案/);
  assert.match(marketing, /推广员工具 · 营销档案/);
  assert.match(marketing, /非本平台成交/);

  assert.match(circle, /推广员工具 · 商圈详情/);
  assert.match(circle, /不在此下单/);
});
