import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const page = () => read('apps/employee-web/app/e/profile/employee-profile.tsx');
const css = () => read('apps/employee-web/app/e/profile/employee-profile.module.css');

test('W∞-69: employee profile has Meituan merchant sticky yellow top bar', () => {
  const p = page();
  assert.match(p, /推广员工具 · 我的工作空间/);
  assert.match(p, /className=\{styles\.topBar\}/);
  assert.match(css(), /#ffe14d/);
  assert.match(css(), /#f5f5f5/);
});

test('W∞-69: employee profile adds real-data distribution panel', () => {
  const p = page();
  assert.match(p, /aria-label="工作空间概况"/);
  assert.match(p, /aria-label="工作空间分布"/);
  assert.match(p, /服务门店分布/);
  assert.match(p, /权限域分布/);
  assert.match(p, /权限级别分布/);
  assert.match(p, /权限项分布/);
});

test('W∞-69: employee profile distributions derive from profile rows', () => {
  const p = page();
  assert.match(p, /\/api\/v1\/employee\/profile/);
  assert.match(p, /countBy\(stores\.map/);
  assert.match(p, /permissionDomain\(code\)/);
  assert.match(p, /permissionLevel\(code\)/);
  assert.match(p, /\/e\/memberships/);
  assert.match(p, /\/e\/customers/);
});

test('W∞-69: honest employee profile boundaries preserved', () => {
  const p = page();
  assert.match(p, /不含第三方订单履约/);
  assert.match(p, /非本平台下单/);
  assert.match(p, /source=local/);
});
