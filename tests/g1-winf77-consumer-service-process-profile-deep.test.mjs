import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const service = () =>
  readFileSync(join(root, 'apps/consumer-web/app/c/services/[id]/service.tsx'), 'utf8');
const serviceCss = () =>
  readFileSync(join(root, 'apps/consumer-web/app/c/services/[id]/service.module.css'), 'utf8');
const processPage = () =>
  readFileSync(join(root, 'apps/consumer-web/app/c/processes/[id]/process.tsx'), 'utf8');
const processCss = () =>
  readFileSync(join(root, 'apps/consumer-web/app/c/processes/[id]/process.module.css'), 'utf8');
const channel = () =>
  readFileSync(join(root, 'apps/consumer-web/app/c/stores/[id]/channel.tsx'), 'utf8');

test('W∞-77: service detail page densified to hero + summary + distribution from real offer rows', () => {
  const p = service();
  assert.match(p, /od-sf-theme/);
  assert.match(p, /styles\.topBar/);
  assert.match(p, /styles\.topTitle/);
  assert.match(p, /推广员工具/);
  assert.match(p, /styles\.heroCard/);
  assert.match(p, /aria-label="套餐概况"/);
  assert.match(p, /styles\.summaryStrip/);
  assert.match(p, /aria-label="套餐数据概况"/);
  assert.match(p, /styles\.distribution/);
  assert.match(p, /aria-label="套餐比价分布"/);
  assert.match(p, /平台入口分布/);
  assert.match(p, /价格带分布/);
  assert.match(p, /时长类型分布/);
  assert.match(p, /服务权益分布/);
  assert.match(p, /内容类型分布/);
  assert.match(p, /data\.platformOffers\.map/);
  assert.match(p, /platformLabel\(offer\.platformType\)/);
  assert.match(p, /countBy\(/);
  assert.match(p, /barWidth\(/);
  assert.match(p, /暂无平台入口记录/);
});

test('W∞-77: service honest boundary + tokenized shared visual language (no warm whiteboard)', () => {
  const p = service();
  const c = serviceCss();
  assert.match(p, /source=local/);
  assert.match(p, /美团\/抖音\/扫呗/);
  assert.match(p, /仅统计观看\/访问\/跳转\/停留\/分享入口痕迹/);
  assert.match(p, /不含支付金额/);
  assert.match(p, /不在此下单/);
  assert.match(p, /非本平台下单/);
  assert.match(c, /var\(--od-sf-canvas\)/);
  assert.match(c, /var\(--od-sf-white\)/);
  assert.match(c, /var\(--od-sf-shadow-card\)/);
  assert.match(c, /linear-gradient\(90deg, var\(--od-brand-700\), var\(--od-brand-600\)\)/);
});

test('W∞-77: process page densified to hero + summary + distribution from real process rows', () => {
  const p = processPage();
  assert.match(p, /od-sf-theme/);
  assert.match(p, /styles\.topBar/);
  assert.match(p, /styles\.topTitle/);
  assert.match(p, /推广员工具/);
  assert.match(p, /styles\.heroCard/);
  assert.match(p, /aria-label="服务过程概况"/);
  assert.match(p, /styles\.summaryStrip/);
  assert.match(p, /aria-label="服务过程数据概况"/);
  assert.match(p, /styles\.distribution/);
  assert.match(p, /aria-label="服务过程分布"/);
  assert.match(p, /进度状态分布/);
  assert.match(p, /咨询与预约分布/);
  assert.match(p, /核销与异常分布/);
  assert.match(p, /结果回执状态分布/);
  assert.match(p, /data\.connectorResults\.map/);
  assert.match(p, /countBy\(/);
  assert.match(p, /barWidth\(/);
  assert.match(p, /暂无结果回执/);
});

test('W∞-77: process honest boundary + tokenized visual language', () => {
  const p = processPage();
  const c = processCss();
  assert.match(p, /source=local/);
  assert.match(p, /美团\/抖音\/扫呗/);
  assert.match(p, /不含支付金额/);
  assert.match(p, /非本平台下单/);
  assert.match(c, /var\(--od-sf-canvas\)/);
  assert.match(c, /var\(--od-sf-white\)/);
  assert.match(c, /var\(--od-sf-shadow-card\)/);
  assert.match(c, /linear-gradient\(90deg, var\(--od-brand-700\), var\(--od-brand-600\)\)/);
});

test('W∞-77: store profile channel renders my-service distribution from real store rows', () => {
  const p = channel();
  assert.match(p, /aria-label="我的服务分布"/);
  assert.match(p, /入口类型分布/);
  assert.match(p, /菜单服务类型分布/);
  assert.match(p, /门店服务覆盖分布/);
  assert.match(p, /profileEntryDist/);
  assert.match(p, /profileServiceDist/);
  assert.match(p, /profileStoreDist/);
  assert.match(p, /data\.externalLinks\.map/);
  assert.match(p, /data\.services\.map/);
  assert.match(p, /countBy\(/);
  assert.match(p, /暂无外链入口记录/);
  assert.doesNotMatch(p, /consumer_orders/);
});
