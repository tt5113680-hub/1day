import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const c = () => read('apps/platform-web/app/bc/merchants/page.tsx');
const cCss = () => read('apps/platform-web/app/bc/merchants/page.module.css');

test('G1-W∞-63: /bc/merchants adds real-data 商圈成员分布 panel', () => {
  assert.match(c(), /aria-label="商圈成员分布"/);
  assert.match(c(), /platformApprovalCounts/);
  assert.match(c(), /circleApprovalCounts/);
  assert.match(c(), /invitationCounts/);
  assert.match(c(), /displayCounts/);
  assert.match(c(), /circleCounts/);
  assert.match(c(), /benefitDensityCounts/);
  for (const label of [
    '平台审核分布',
    '商圈审核分布',
    '邀请状态分布',
    '展示状态分布',
    '商户归属商圈分布',
    '联合权益覆盖分布',
  ]) {
    assert.match(c(), new RegExp(`<h2>${label}</h2>`));
  }
  assert.match(c(), /barWidth\(members\.length, b\.value\)/);
  assert.match(c(), /暂无记录/);
  assert.match(c(), /非本平台下单/);
});

test('G1-W∞-63: /bc/merchants keeps circle Meituan-parity yellow top bar + gray canvas + summary', () => {
  assert.match(c(), /推广员工具 · 商圈成员治理/);
  assert.match(c(), /<h1>邀请、双重审批并展示已批准商户<\/h1>/);
  assert.match(c(), /topBar/);
  assert.match(c(), /heroCard/);
  assert.match(c(), /summaryStrip/);
  assert.match(c(), /aria-label="商圈成员概况"/);
  assert.match(c(), /成员记录/);
  assert.match(c(), /已批准/);
  assert.match(c(), /待审核/);
  assert.match(c(), /覆盖商圈/);
  assert.match(cCss(), /background:\s*#f5f5f5/);
});

test('G1-W∞-63: /bc/merchants distribution/bar CSS present + responsive stacking', () => {
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

test('G1-W∞-63: honest source=local disclaimer and circle-merchant API preserved', () => {
  assert.match(c(), /source=local/);
  assert.match(c(), /不包含本平台收款/);
  assert.match(c(), /非本平台下单/);
  assert.match(c(), /未接美团实时商户数据/);
  assert.match(c(), /api\/v1\/circle\/merchants/);
  assert.match(c(), /data\?\.members/);
  assert.match(c(), /platformApprovalStatus/);
  assert.match(c(), /merchantPool/);
  assert.match(c(), /推广员工具 · 商圈成员治理/);
});
