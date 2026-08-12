import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const page = () =>
  readFileSync(join(root, 'apps/consumer-web/app/c/stores/[id]/store.tsx'), 'utf8');
const css = () =>
  readFileSync(join(root, 'apps/consumer-web/app/c/stores/[id]/store.module.css'), 'utf8');

test('W∞-74: store page renders hero card + summary strip + store entry distribution panel', () => {
  const p = page();
  assert.match(p, /styles\.heroCard/);
  assert.match(p, /aria-label="门店概况"/);
  assert.match(p, /styles\.summaryStrip/);
  assert.match(p, /aria-label="门店数据概况"/);
  assert.match(p, /styles\.distribution/);
  assert.match(p, /aria-label="门店入口分布"/);
  assert.match(p, /平台入口分布/);
  assert.match(p, /服务类型分布/);
  assert.match(p, /行动入口分布/);
  assert.match(p, /内容类型分布/);
  assert.match(p, /装修模块分布/);
});

test('W∞-74: distributions derive from real StoreDetail rows (no fake BI)', () => {
  const p = page();
  assert.match(p, /data\.platformOffers\.flatMap/);
  assert.match(p, /data\.services\.map/);
  assert.match(p, /data\.actions\.map/);
  assert.match(p, /data\.content\.map/);
  assert.match(p, /effectiveStorefrontModules\(data\.storefront\?\.modules\)\.map/);
  assert.match(p, /item\.duration_minutes/);
  assert.match(p, /item\.platformType/);
  assert.match(p, /item\.content_type/);
  assert.match(p, /countBy\(/);
  assert.match(p, /barWidth\(/);
  assert.match(p, /暂无平台入口记录/);
});

test('W∞-74: tool identity eyebrow + honest boundary retained', () => {
  const p = page();
  assert.match(p, /推广员工具/);
  assert.match(p, /source=local/);
  assert.match(p, /不在此下单/);
  assert.match(p, /非本平台下单/);
  assert.match(p, /美团\/抖音\/扫呗/);
  assert.match(p, /仅统计观看\/访问\/跳转\/停留\/分享入口痕迹/);
  assert.match(p, /不含支付金额/);
  assert.match(p, /不接美团\/抖音实时商户数据/);
});

test('W∞-74: yellow gradient bars + white cards on gray canvas (shared visual language)', () => {
  const c = css();
  assert.match(c, /linear-gradient\(90deg, var\(--od-brand-700\), var\(--od-brand-600\)\)/);
  assert.match(c, /var\(--od-sf-white\)/);
  assert.match(c, /var\(--od-sf-shadow-card\)/);
  assert.match(c, /\.distribution/);
});
