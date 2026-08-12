import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const page = () =>
  readFileSync(join(root, 'apps/consumer-web/app/c/entry/consumer-entry.tsx'), 'utf8');
const css = () =>
  readFileSync(join(root, 'apps/consumer-web/app/c/entry/consumer-entry.module.css'), 'utf8');

test('W∞-72: consumer entry page renders Meituan sticky yellow top bar + tool identity', () => {
  const p = page();
  const c = css();
  assert.match(p, /od-sf-theme/);
  assert.match(p, /styles\.topBar/);
  assert.match(p, /推广员工具/);
  assert.match(p, /aria-label="返回发现"/);
  assert.match(c, /position:\s*sticky/);
  assert.match(c, /var\(--od-brand-700\)/);
  assert.match(c, /var\(--od-sf-canvas\)/);
});

test('W∞-72: hero card + summary strip + unified entry distribution panel exist', () => {
  const p = page();
  assert.match(p, /aria-label="统一入口概况"/);
  assert.match(p, /styles\.heroCard/);
  assert.match(p, /aria-label="入口数据概况"/);
  assert.match(p, /styles\.summaryStrip/);
  assert.match(p, /aria-label="统一入口分布"/);
  assert.match(p, /styles\.distribution/);
});

test('W∞-72: distributions derive from real actions[] rows (no fake BI)', () => {
  const p = page();
  assert.match(p, /entry\.actions\.map/);
  assert.match(p, /countBy\(/);
  assert.match(p, /barWidth\(/);
  assert.match(p, /action\.platform/);
  assert.match(p, /action\.actionType/);
  assert.match(p, /暂无记录/);
});

test('W∞-72: yellow gradient bars + white cards on gray canvas, honest boundary retained', () => {
  const p = page();
  const c = css();
  assert.match(c, /linear-gradient\(90deg, var\(--od-brand-700\), var\(--od-brand-600\)\)/);
  assert.match(c, /var\(--od-sf-white\)/);
  assert.match(c, /var\(--od-sf-shadow-card\)/);
  assert.match(p, /source=local/);
  assert.match(p, /非本平台下单/);
  assert.match(p, /不在此下单/);
  assert.match(p, /美团\/抖音\/扫呗/);
  assert.match(p, /仅统计观看\/访问\/跳转\/停留\/分享入口痕迹/);
  assert.doesNotMatch(c, /#[0-9a-fA-F]{3,8}\b/);
});
