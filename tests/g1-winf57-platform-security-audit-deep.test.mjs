import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const c = () => read('apps/platform-web/app/p/security-audit/page.tsx');
const cCss = () => read('apps/platform-web/app/p/security-audit/page.module.css');

test('G1-W∞-57: /p/security-audit adds real-data 平台安全分布 panel', () => {
  assert.match(c(), /aria-label="平台安全分布"/);
  assert.doesNotMatch(c(), /AdminPageHeader/);
  assert.doesNotMatch(c(), /<Card\b/);
  assert.doesNotMatch(c(), /ONEDAY \/ 平台安全治理/);
  assert.match(c(), /severityCounts/);
  assert.match(c(), /kindCounts/);
  assert.match(c(), /reviewCounts/);
  assert.match(c(), /eventCounts/);
  assert.match(c(), /resourceCounts/);
  for (const label of [
    '严重度分布',
    '风险类型分布',
    '处置状态分布',
    '事件类型分布',
    '资源类型分布',
  ]) {
    assert.match(c(), new RegExp(`<h2>${label}</h2>`));
  }
  assert.match(c(), /barWidth\(risks\.length, b\.value\)/);
  assert.match(c(), /barWidth\(events\.length, b\.value\)/);
  assert.match(c(), /暂无记录/);
  assert.match(c(), /非本平台下单/);
});

test('G1-W∞-57: /p/security-audit uses platform Meituan-parity yellow top bar + gray canvas', () => {
  assert.match(c(), /推广员工具 · 平台安全审计/);
  assert.match(c(), /<h1>风险信号、越权审计、连接器与安全事件<\/h1>/);
  assert.match(c(), /topBar/);
  assert.match(c(), /heroCard/);
  assert.match(c(), /data-testid="platform-security-audit"/);
  assert.match(cCss(), /background:\s*#f5f5f5/);
});

test('G1-W∞-57: /p/security-audit distribution/bar CSS present + responsive stacking', () => {
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

test('G1-W∞-57: honest source=local disclaimer and acknowledge audit ops preserved', () => {
  assert.match(c(), /source=local/);
  assert.match(c(), /风险严重度、风险类型/);
  assert.match(c(), /不包含本平台收款/);
  assert.match(c(), /仅记录本地健康观察/);
  assert.match(c(), /确认处置/);
  assert.match(c(), /待审查风险信号/);
  assert.match(c(), /安全事件链/);
  assert.match(c(), /安全边际/);
  assert.match(c(), /risks\.map/);
});
