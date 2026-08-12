import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const c = () => read('apps/platform-web/app/p/dashboard/page.tsx');
const cCss = () => read('apps/platform-web/app/p/dashboard/page.module.css');
const svc = () => read('apps/api/src/platform-dashboard.service.ts');

test('G1-W∞-61: /p/dashboard adds real-data 平台运营分布 panel', () => {
  assert.match(c(), /aria-label="平台运营分布"/);
  assert.match(c(), /tenantStatusCounts/);
  assert.match(c(), /planCounts/);
  assert.match(c(), /riskLevelCounts/);
  assert.match(c(), /channelPlatformCounts/);
  assert.match(c(), /signalCounts/);
  assert.match(c(), /outboxEventCounts/);
  assert.match(c(), /outboxAttemptsCounts/);
  for (const label of [
    '租户状态分布',
    '套餐分布',
    '风险等级分布',
    '渠道平台分布',
    '入口痕迹分布',
    'Outbox 死信状态分布',
    '死信重试分布',
  ]) {
    assert.match(c(), new RegExp(`<h2>${label}</h2>`));
  }
  assert.match(c(), /barWidth\(data\.tenants\.length, b\.value\)/);
  assert.match(c(), /barWidth\(channelTotal, b\.value\)/);
  assert.match(c(), /barWidth\(signalTotal, b\.value\)/);
  assert.match(c(), /barWidth\(outboxTotal, b\.value\)/);
  assert.match(c(), /暂无记录/);
  assert.match(c(), /非本平台下单/);
});

test('G1-W∞-61: /p/dashboard keeps Meituan-parity yellow top bar + gray canvas + summary + hero', () => {
  assert.match(c(), /推广员工具 · 平台总览/);
  assert.match(c(), /<h1>跨租户入口信号与系统状态<\/h1>/);
  assert.match(c(), /topBar/);
  assert.match(c(), /heroCard/);
  assert.match(c(), /summaryStrip/);
  assert.match(c(), /aria-label="平台概况"/);
  assert.match(cCss(), /background:\s*#f5f5f5/);
});

test('G1-W∞-61: /p/dashboard distribution/bar CSS present + responsive stacking', () => {
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

test('G1-W∞-61: honest source=local disclaimer and real-data service queries preserved', () => {
  assert.match(c(), /source=local/);
  assert.match(c(), /不含本平台收款/);
  assert.match(c(), /未接美团实时商户数据/);
  assert.match(c(), /api\/v1\/platform\/dashboard/);
  assert.match(svc(), /entry_funnel_events/);
  assert.match(svc(), /external_actions/);
  assert.match(svc(), /needs_attention/);
  assert.match(svc(), /platform_tenant_settings/);
  assert.match(c(), /推广员工具 · 平台总览/);
});
