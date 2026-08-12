import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const profile = () =>
  readFileSync(join(root, 'apps/consumer-web/app/c/profile/profile.tsx'), 'utf8');
const profileCss = () =>
  readFileSync(join(root, 'apps/consumer-web/app/c/profile/profile.module.css'), 'utf8');
const circles = () =>
  readFileSync(join(root, 'apps/consumer-web/app/c/circles/circles-home.tsx'), 'utf8');
const circlesCss = () =>
  readFileSync(join(root, 'apps/consumer-web/app/c/circles/circles.module.css'), 'utf8');

test('W∞-75: profile page renders yellow top bar + hero card + summary strip + distribution panel', () => {
  const p = profile();
  assert.match(p, /styles\.topBar/);
  assert.match(p, /styles\.heroCard/);
  assert.match(p, /aria-label="我的会员概况"/);
  assert.match(p, /styles\.summaryStrip/);
  assert.match(p, /aria-label="我的会员数据概况"/);
  assert.match(p, /styles\.distribution/);
  assert.match(p, /aria-label="我的会员分布"/);
  assert.match(p, /绑定身份分布/);
  assert.match(p, /权益分布/);
  assert.match(p, /服务历史状态分布/);
  assert.match(p, /服务历史时间分布/);
});

test('W∞-75: profile distributions derive from real ProfileData rows (no fake BI)', () => {
  const p = profile();
  assert.match(p, /data\.profile\.identities\.map/);
  assert.match(p, /data\.benefits\.map/);
  assert.match(p, /data\.history\.map/);
  assert.match(p, /item\.status/);
  assert.match(p, /item\.occurredAt/);
  assert.match(p, /countBy\(/);
  assert.match(p, /barWidth\(/);
  assert.match(p, /暂无绑定身份/);
  assert.match(p, /暂无服务记录/);
});

test('W∞-75: profile tool identity + honest boundary retained, CSS tokenized', () => {
  const p = profile();
  const c = profileCss();
  assert.match(p, /推广员工具/);
  assert.match(p, /source=local/);
  assert.match(p, /不在此下单/);
  assert.match(p, /非本平台下单/);
  assert.match(p, /美团\/抖音\/扫呗/);
  assert.match(c, /linear-gradient\(90deg, var\(--od-brand-700\), var\(--od-brand-600\)\)/);
  assert.match(c, /var\(--od-sf-white\)/);
  assert.match(c, /var\(--od-sf-shadow-card\)/);
  assert.doesNotMatch(c, /#[0-9a-fA-F]{6}/);
});

test('W∞-75: circles page renders hero + summary + distribution with real CirclesData rows', () => {
  const p = circles();
  assert.match(p, /aria-label="商圈概况"/);
  assert.match(p, /styles\.summaryStrip/);
  assert.match(p, /aria-label="商圈数据概况"/);
  assert.match(p, /styles\.distribution/);
  assert.match(p, /aria-label="商圈分布"/);
  assert.match(p, /行业分布/);
  assert.match(p, /商户规模分布/);
  assert.match(p, /覆盖距离分布/);
  assert.match(p, /商圈身份分布/);
  assert.match(p, /data\.items\.map/);
  assert.match(p, /item\.merchantCount/);
  assert.match(p, /item\.distanceKm/);
  assert.match(p, /item\.ownedByViewer/);
  assert.match(p, /countBy\(/);
  assert.match(p, /barWidth\(/);
  assert.match(p, /暂无商圈记录/);
});

test('W∞-75: circles honest boundary retained in gray-white shared visual language', () => {
  const p = circles();
  const c = circlesCss();
  assert.match(p, /source=local/);
  assert.match(p, /不在此下单/);
  assert.match(p, /非本平台下单/);
  assert.match(p, /美团\/抖音\/扫呗/);
  assert.match(p, /不含支付金额/);
  assert.match(c, /linear-gradient\(90deg, var\(--od-brand-700\), var\(--od-brand-600\)\)/);
  assert.match(c, /var\(--od-sf-white\)/);
  assert.match(c, /var\(--od-sf-shadow-card\)/);
});
