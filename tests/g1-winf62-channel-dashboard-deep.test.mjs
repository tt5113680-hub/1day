import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const c = () => read('apps/platform-web/app/ch/dashboard/page.tsx');
const cCss = () => read('apps/platform-web/app/ch/dashboard/page.module.css');

test('G1-W∞-62: /ch/dashboard adds real-data 渠道运营分布 panel', () => {
  assert.match(c(), /aria-label="渠道运营分布"/);
  assert.match(c(), /onboardingCounts/);
  assert.match(c(), /planCounts/);
  assert.match(c(), /riskLevelCounts/);
  assert.match(c(), /regionCounts/);
  assert.match(c(), /activeCounts/);
  assert.match(c(), /signalCounts/);
  for (const label of [
    '开通状态分布',
    '套餐分布',
    '风险等级分布',
    '省市区代理树 · 归属区域分布',
    '近 30 天活跃分布',
    '跟进信号分布',
  ]) {
    assert.match(c(), new RegExp(`<h2>${label}</h2>`));
  }
  assert.match(c(), /barWidth\(merchants\.length, b\.value\)/);
  assert.match(c(), /暂无记录/);
  assert.match(c(), /非本平台下单/);
});

test('G1-W∞-62: /ch/dashboard keeps channel Meituan-parity yellow top bar + gray canvas + summary', () => {
  assert.match(c(), /推广员工具 · 渠道代理/);
  assert.match(c(), /<h1>商户开通队列与跟进信号<\/h1>/);
  assert.match(c(), /topBar/);
  assert.match(c(), /heroCard/);
  assert.match(c(), /summaryStrip/);
  assert.match(c(), /aria-label="渠道概况"/);
  assert.match(c(), /渠道商户/);
  assert.match(c(), /已开通/);
  assert.match(cCss(), /background:\s*#f5f5f5/);
});

test('G1-W∞-62: /ch/dashboard distribution/bar CSS present + responsive stacking', () => {
  assert.match(cCss(), /\.distribution\s*\{/);
  assert.match(cCss(), /\.panelBlock\s*\{/);
  assert.match(cCss(), /\.barFill\s*\{/);
  assert.match(cCss(), /\.barTrack\s*\{/);
  assert.match(cCss(), /\.barRow\s*\{/);
  assert.match(cCss(), /\.barValue\s*\{/);
  assert.match(cCss(), /\.barLabel\s*\{/);
  assert.match(cCss(), /\.barEmpty\s*\{/);
  assert.match(cCss(), /\.summaryStrip\s*\{/);
  assert.match(cCss(), /\.barFill\s*\{\s*display:\s*block;/);
  assert.match(cCss(), /background:\s*linear-gradient\(90deg,\s*#ffd100,\s*#f0a500\);/);
  assert.match(cCss(), /\.distribution\s*\{\s*grid-template-columns:\s*1fr;\s*\}/);
});

test('G1-W∞-62: honest source=local disclaimer and channel service preserved', () => {
  assert.match(c(), /source=local/);
  assert.match(c(), /不碰钱/);
  assert.match(c(), /非成交漏斗/);
  assert.match(c(), /未接美团实时商户数据/);
  assert.match(c(), /api\/v1\/channel\/dashboard/);
  assert.match(c(), /data\?\.merchants/);
  assert.match(c(), /renewalSignal/);
  assert.match(c(), /推广员工具 · 渠道代理/);
});
