import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const c = () => read('apps/platform-web/app/p/templates/page.tsx');
const cCss = () => read('apps/platform-web/app/p/templates/page.module.css');

test('G1-W∞-59: /p/templates adds real-data 平台模板分布 panel', () => {
  assert.match(c(), /aria-label="平台模板分布"/);
  assert.doesNotMatch(c(), /AdminPageHeader/);
  assert.doesNotMatch(c(), /<Card\b/);
  assert.doesNotMatch(c(), /ONEDAY \/ 平台模板治理/);
  assert.match(c(), /targetCounts/);
  assert.match(c(), /publishCounts/);
  assert.match(c(), /industryCounts/);
  assert.match(c(), /storeCounts/);
  assert.match(c(), /versionBuckets/);
  for (const label of [
    '模板目标分布',
    '发布状态分布',
    '行业配置分布',
    '绑定数字门店分布',
    '版本演进分布',
  ]) {
    assert.match(c(), new RegExp(`<h2>${label}</h2>`));
  }
  assert.match(c(), /barWidth\(templates\.length, b\.value\)/);
  assert.match(c(), /barWidth\(boundCount, b\.value\)/);
  assert.match(c(), /暂无记录/);
  assert.match(c(), /非本平台下单/);
});

test('G1-W∞-59: /p/templates uses platform Meituan-parity yellow top bar + gray canvas', () => {
  assert.match(c(), /推广员工具 · 平台模板治理/);
  assert.match(c(), /<h1>固定组件、行业配置与受控发布<\/h1>/);
  assert.match(c(), /topBar/);
  assert.match(c(), /heroCard/);
  assert.match(c(), /data-testid="platform-templates"/);
  assert.match(cCss(), /background:\s*#f5f5f5/);
});

test('G1-W∞-59: /p/templates distribution/bar CSS present + responsive stacking', () => {
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

test('G1-W∞-59: honest source=local disclaimer and template governance ops preserved', () => {
  assert.match(c(), /source=local/);
  assert.match(c(), /不包含本平台收款/);
  assert.match(c(), /未接美团\/抖音实时投放/);
  assert.match(c(), /保存平台模板草稿/);
  assert.match(c(), /已持久化模板/);
  assert.match(c(), /实时预览与发布/);
  assert.match(c(), /发布当前版本/);
  assert.match(c(), /templates\.map/);
  assert.match(c(), /预览模块/);
});
