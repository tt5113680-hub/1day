import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const page = () =>
  readFileSync(join(root, 'apps/consumer-web/app/c/stores/[id]/channel.tsx'), 'utf8');
const css = () =>
  readFileSync(join(root, 'apps/consumer-web/app/c/stores/[id]/channel.module.css'), 'utf8');

test('W∞-71: consumer deep-channel pages render Meituan sticky yellow top bar', () => {
  const p = page();
  const c = css();
  assert.match(p, /od-sf-theme/);
  assert.match(p, /styles\.topBar/);
  assert.match(p, /推广员工具/);
  assert.match(p, /aria-label="返回门店"/);
  assert.match(c, /position:\s*sticky/);
  assert.match(c, /var\(--od-brand-700\)/);
  assert.match(c, /var\(--od-sf-canvas\)/);
});

test('W∞-71: hero card + summary strip + per-channel distribution panels exist', () => {
  const p = page();
  assert.match(p, /aria-label="频道概况"/);
  assert.match(p, /styles\.heroCard/);
  assert.match(p, /aria-label="频道数据概况"/);
  assert.match(p, /styles\.summaryStrip/);
  assert.match(p, /aria-label="团购比价分布"/);
  assert.match(p, /aria-label="菜单分布"/);
  assert.match(p, /aria-label="权益分布"/);
  assert.match(p, /styles\.distribution/);
});

test('W∞-71: distributions derive from real StoreDetail rows (no fake BI)', () => {
  const p = page();
  assert.match(p, /data\.platformOffers\.map/);
  assert.match(p, /data\.services\.map/);
  assert.match(p, /data\.benefits\.map/);
  assert.match(p, /countBy\(/);
  assert.match(p, /barWidth\(/);
  assert.match(p, /offerPrice/);
  assert.match(p, /duration_minutes/);
  assert.match(p, /暂无记录/);
});

test('W∞-71: yellow gradient bars + white cards on gray canvas, honest boundary retained', () => {
  const p = page();
  const c = css();
  assert.match(c, /linear-gradient\(90deg, var\(--od-brand-700\), var\(--od-brand-600\)\)/);
  assert.match(c, /var\(--od-sf-white\)/);
  assert.match(c, /var\(--od-sf-shadow-card\)/);
  assert.match(p, /source=local/);
  assert.match(p, /不包含本平台收款/);
  assert.match(p, /非本平台下单/);
  assert.match(p, /美团\/抖音\/扫呗/);
  assert.match(p, /不在此下单/);
  assert.doesNotMatch(c, /#[0-9a-fA-F]{3,8}\b/);
});
