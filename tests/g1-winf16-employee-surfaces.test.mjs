import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('G1-W∞-16: employee ME-03..07 + task detail densify', () => {
  const root = process.cwd();
  const read = (rel) => readFileSync(join(root, rel), 'utf8');

  const customers = read('apps/employee-web/app/e/customers/customer-directory.tsx');
  const store = read('apps/employee-web/app/e/store/store-home.tsx');
  const memberships = read('apps/employee-web/app/e/memberships/membership-redeem.tsx');
  const profile = read('apps/employee-web/app/e/profile/employee-profile.tsx');
  const notifications = read('apps/employee-web/app/e/notifications/notification-center.tsx');
  const taskDetail = read('apps/employee-web/app/e/tasks/[id]/task-detail.tsx');
  const e2e = read('tests/e2e/audit-batch-7-commercial-ux.spec.ts');

  assert.match(customers, /推广员工具 · 客户目录/);
  assert.match(customers, /不含第三方订单履约/);

  assert.match(store, /推广员工具 · 店长模式/);
  assert.match(store, /不碰钱/);
  assert.match(store, /本页不含支付金额/);

  assert.match(memberships, /推广员工具 · 会员核销/);
  assert.match(memberships, /不含支付金额/);

  assert.match(profile, /推广员工具 · 我的工作空间/);
  assert.match(profile, /\/e\/memberships/);
  assert.match(profile, /\/e\/customers/);

  assert.match(notifications, /推广员工具 · 执行提醒/);
  assert.match(notifications, /不含第三方订单履约/);

  assert.match(taskDetail, /推广员工具 · 任务详情/);
  assert.match(taskDetail, /第三方结果单号/);
  assert.doesNotMatch(taskDetail, /结果订单号/);

  assert.match(e2e, /第三方结果单号/);
  assert.doesNotMatch(e2e, /结果订单号/);
});
