import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const page = () => read('apps/employee-web/app/e/customers/customer-directory.tsx');
const css = () => read('apps/employee-web/app/e/customers/customer-directory.module.css');

test('W∞-65: employee customer directory has Meituan merchant sticky yellow top bar', () => {
  const p = page();
  const c = css();
  assert.match(p, /推广员工具 · 客户目录/);
  assert.match(p, /className=\{styles\.topBar\}/);
  assert.match(c, /background:\s*linear-gradient\(180deg,\s*#ffe14d/);
  assert.match(c, /background:\s*#f5f5f5/);
  assert.match(p, /className=\{styles\.heroCard\}/);
  assert.match(p, /<h1>客户目录<\/h1>/);
});

test('W∞-65: employee customer directory adds real-data distribution panel', () => {
  const p = page();
  assert.match(p, /aria-label="客户概况"/);
  assert.match(p, /aria-label="客户跟进分布"/);
  assert.match(p, /归属分布/);
  assert.match(p, /状态分布/);
  assert.match(p, /待办负载分布/);
  assert.match(p, /建档窗口分布/);
  assert.match(p, /summaryStrip/);
  assert.match(css(), /#ffd100.*#f0a500|#f0a500/);
});

test('W∞-65: employee customer distributions derive from customers rows', () => {
  const p = page();
  assert.match(p, /countBy\(customers\.map/);
  assert.match(p, /row\.owned \? '归属中' : '协作中'/);
  assert.match(p, /statusLabel\(row\.status\)/);
  assert.match(p, /taskLoadBucket\(row\.openTasks/);
  assert.match(p, /createdBucket\(row\.createdAt\)/);
  assert.match(p, /barWidth\(total,\s*item\.value\)|barWidth\(customers\.length/);
  assert.match(p, /\/api\/v1\/employee\/customers/);
});

test('W∞-65: honest employee customer boundaries preserved', () => {
  const p = page();
  assert.match(p, /不含第三方订单履约/);
  assert.match(p, /不代履约美团\/抖音订单/);
  assert.match(p, /非本平台下单/);
  assert.match(p, /source=local/);
  assert.match(p, /不宣称跨店导出/);
  assert.doesNotMatch(p, /本平台收款/);
});
