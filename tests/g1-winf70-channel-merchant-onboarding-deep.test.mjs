import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const page = () => read('apps/platform-web/app/ch/merchants/new/page.tsx');
const css = () => read('apps/platform-web/app/ch/merchants/new/page.module.css');

test('W∞-70: channel merchant onboarding has Meituan sticky yellow top bar', () => {
  const p = page();
  assert.match(p, /推广员工具 · 渠道商户开通/);
  assert.match(p, /PlatformProductHome mode="channel"/);
  assert.match(p, /from '\.\.\/\.\.\/\.\.\/platform-product-home'/);
  assert.match(p, /className=\{styles\.topBar\}/);
  assert.match(css(), /#ffe14d/);
  assert.match(css(), /#f5f5f5/);
  assert.match(p, /邀请、初始化与交付商户/);
});

test('W∞-70: channel merchant onboarding adds real-data distribution panel', () => {
  const p = page();
  assert.match(p, /aria-label="开通概况"/);
  assert.match(p, /aria-label="商户开通分布"/);
  assert.match(p, /邀请状态分布/);
  assert.match(p, /交付状态分布/);
  assert.match(p, /套餐分布/);
  assert.match(p, /模板分布/);
  assert.match(p, /归属渠道分布/);
});

test('W∞-70: channel onboarding distributions derive from onboardings rows', () => {
  const p = page();
  assert.match(p, /\/api\/v1\/channel\/merchant-onboardings/);
  assert.match(p, /countBy\(items\.map/);
  assert.match(p, /deliveryLabel\(row\.deliveryStatus\)/);
  assert.match(p, /planLabel\(row\.plan\)/);
  assert.match(p, /templateLabel\(row\.template\)/);
  assert.match(p, /创建开通记录/);
  assert.match(p, /确认交付/);
});

test('W∞-70: honest channel onboarding boundaries preserved', () => {
  const p = page();
  assert.match(p, /source=local/);
  assert.match(p, /不含本平台收款/);
  assert.match(p, /非本平台下单/);
  assert.doesNotMatch(p, /AdminPageHeader/);
  assert.doesNotMatch(p, /ONEDAY \/ 渠道商户开通/);
});
