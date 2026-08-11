import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const c = () => read('apps/platform-web/app/p/agents/page.tsx');
const cCss = () => read('apps/platform-web/app/p/agents/page.module.css');

test('G1-W∞-52: /p/agents adds real-data 代理运营分布 panel', () => {
  assert.match(c(), /aria-label="代理运营分布"/);
  assert.doesNotMatch(c(), /AdminPageHeader/);
  assert.match(c(), /agentLevelCounts/);
  assert.match(c(), /agentStatusCounts/);
  assert.match(c(), /regionLevelCounts/);
  assert.match(c(), /settlementStatusCounts/);
  assert.match(c(), /approvalStatusCounts/);
  for (const label of [
    '代理层级分布',
    '代理状态分布',
    '区域层级分布',
    '结算状态分布',
    '入驻审批状态分布',
  ]) {
    assert.match(c(), new RegExp(`<h2>${label}</h2>`));
  }
  assert.match(c(), /barWidth\(agentTotal, b\.value\)/);
  assert.match(c(), /barWidth\(regionTotal, b\.value\)/);
  assert.match(c(), /barWidth\(settlementTotal, b\.value\)/);
  assert.match(c(), /barWidth\(approvalTotal, b\.value\)/);
  assert.match(c(), /暂无记录/);
  assert.match(c(), /非本平台下单/);
});

test('G1-W∞-52: /p/agents uses platform Meituan-parity yellow top bar + gray canvas', () => {
  assert.match(c(), /推广员工具 · 省市区代理/);
  assert.match(c(), /<h1>代理树、商户归属与配额结算<\/h1>/);
  assert.match(c(), /topBar/);
  assert.match(c(), /heroCard/);
  assert.match(c(), /data-testid="platform-agents"/);
  assert.match(cCss(), /background:\s*#f5f5f5/);
});

test('G1-W∞-52: /p/agents distribution/bar CSS present + responsive stacking', () => {
  assert.match(cCss(), /\.distribution\s*\{/);
  assert.match(cCss(), /\.panelBlock\s*\{/);
  assert.match(cCss(), /\.barFill\s*\{/);
  assert.match(cCss(), /\.barTrack\s*\{/);
  assert.match(cCss(), /\.barRow\s*\{/);
  assert.match(cCss(), /\.barValue\s*\{/);
  assert.match(cCss(), /\.barEmpty\s*\{/);
  assert.match(cCss(), /\.barFill\s*\{\s*display:\s*block;/);
  assert.match(cCss(), /background:\s*linear-gradient\(90deg,\s*#ffd100,\s*#f0a500\);/);
  assert.match(cCss(), /\.distribution\s*\{\s*grid-template-columns:\s*1fr;\s*\}/);
});

test('G1-W∞-52: honest source=local disclaimer and agent ops ID preserved', () => {
  assert.match(c(), /source=local/);
  assert.match(c(), /结算\/配额是代理运营账，不是消费者成交/);
  assert.match(c(), /未接美团实时代理数据/);
  assert.match(c(), /不包含本平台收款/);
  assert.match(c(), /省市区代理树/);
  assert.match(c(), /入驻配额/);
  assert.match(c(), /周期结算/);
  assert.match(c(), /入驻开通审批/);
});
