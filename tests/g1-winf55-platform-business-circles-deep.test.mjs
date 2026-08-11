import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const c = () => read('apps/platform-web/app/p/business-circles/page.tsx');
const cCss = () => read('apps/platform-web/app/p/business-circles/page.module.css');

test('G1-W∞-55: /p/business-circles adds real-data 商圈运营分布 panel', () => {
  assert.match(c(), /aria-label="商圈运营分布"/);
  assert.doesNotMatch(c(), /AdminPageHeader/);
  assert.doesNotMatch(c(), /<Card\b/);
  assert.doesNotMatch(c(), /ONEDAY \/ 平台固定商圈/);
  assert.match(c(), /circleScaleCounts/);
  assert.match(c(), /approvalCounts/);
  assert.match(c(), /memberCircleCounts/);
  assert.match(c(), /benefitScaleCounts/);
  for (const label of ['商圈规模分布', '推荐审批状态分布', '商圈覆盖商户分布', '推荐权益分布']) {
    assert.match(c(), new RegExp(`<h2>${label}</h2>`));
  }
  assert.match(c(), /barWidth\(data\.circles\.length, b\.value\)/);
  assert.match(c(), /barWidth\(totalRecalls, b\.value\)/);
  assert.match(c(), /暂无记录/);
  assert.match(c(), /非本平台下单/);
});

test('G1-W∞-55: /p/business-circles uses platform Meituan-parity yellow top bar + gray canvas', () => {
  assert.match(c(), /推广员工具 · 平台商圈管理/);
  assert.match(c(), /<h1>固定商圈、推荐商户与平台审批<\/h1>/);
  assert.match(c(), /topBar/);
  assert.match(c(), /heroCard/);
  assert.match(c(), /data-testid="platform-business-circles"/);
  assert.match(cCss(), /background:\s*#f5f5f5/);
});

test('G1-W∞-55: /p/business-circles distribution/bar CSS present + responsive stacking', () => {
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

test('G1-W∞-55: honest source=local disclaimer and circle ops preserved', () => {
  assert.match(c(), /source=local/);
  assert.match(c(), /商圈是商家联盟整合网络/);
  assert.match(c(), /不包含本平台收款/);
  assert.match(c(), /未接美团实时商户数据/);
  assert.match(c(), /建立商圈并提交推荐/);
  assert.match(c(), /可推荐商户池/);
  assert.match(c(), /固定商圈与审批队列/);
  assert.match(c(), /circle\.merchants\.map/);
});
