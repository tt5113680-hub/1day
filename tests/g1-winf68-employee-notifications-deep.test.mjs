import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const page = () => read('apps/employee-web/app/e/notifications/notification-center.tsx');
const css = () => read('apps/employee-web/app/e/notifications/notification-center.module.css');

test('W∞-68: employee notifications has Meituan merchant sticky yellow top bar', () => {
  const p = page();
  assert.match(p, /推广员工具 · 执行提醒/);
  assert.match(p, /className=\{styles\.topBar\}/);
  assert.match(css(), /#ffe14d/);
  assert.match(css(), /#f5f5f5/);
  assert.match(p, /<h1>执行提醒<\/h1>/);
});

test('W∞-68: employee notifications adds real-data distribution panel', () => {
  const p = page();
  assert.match(p, /aria-label="通知概况"/);
  assert.match(p, /aria-label="执行提醒分布"/);
  assert.match(p, /类型分布/);
  assert.match(p, /已读状态分布/);
  assert.match(p, /发送窗口分布/);
  assert.match(p, /处理入口分布/);
});

test('W∞-68: employee notification distributions derive from notification rows', () => {
  const p = page();
  assert.match(p, /\/api\/v1\/employee\/notifications/);
  assert.match(p, /countBy\(items\.map/);
  assert.match(p, /labels\[row\.category\]/);
  assert.match(p, /row\.readAt \? '已读' : '未读'/);
  assert.match(p, /ageBucket\(row\.sentAt\)/);
  assert.match(p, /linkBucket\(row\.deepLink\)/);
});

test('W∞-68: honest employee notification boundaries preserved', () => {
  const p = page();
  assert.match(p, /不含第三方订单履约/);
  assert.match(p, /支付成功态/);
  assert.match(p, /非本平台下单/);
  assert.match(p, /source=local/);
});
