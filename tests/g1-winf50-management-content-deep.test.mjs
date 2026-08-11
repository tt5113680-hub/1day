import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const c = () => read('apps/management-web/app/m/content/page.tsx');
const cCss = () => read('apps/management-web/app/m/content/page.module.css');

test('G1-W∞-50: content adds real-data 营销内容分布 panel', () => {
  assert.match(c(), /aria-label="营销内容分布"/);
  assert.doesNotMatch(c(), /AdminPageHeader/);
  // real-data buckets computed from fetched content/placement rows
  assert.match(c(), /statusCounts\.set/);
  assert.match(c(), /kindCounts\.set/);
  assert.match(c(), /channelCounts\.set/);
  assert.match(c(), /storeCounts\.set/);
  for (const label of ['内容状态分布', '内容类型分布', '渠道分发登记分布', '投放门店分布']) {
    assert.match(c(), new RegExp(`<h2>${label}</h2>`));
  }
  // share bars are real-data driven (not hard-coded percentages)
  assert.match(c(), /itemsTotal \? \(b\.value \/ itemsTotal\) \* 100/);
  assert.match(c(), /channelTotal \? \(b\.value \/ channelTotal\) \* 100/);
  assert.match(c(), /storeTotal \? \(b\.value \/ storeTotal\) \* 100/);
  // bucket labels derived from real status / kind / channel / store rows
  assert.match(c(), /已审批/);
  assert.match(c(), /草稿/);
  assert.match(c(), /未绑定门店/);
  assert.match(c(), /暂无记录|暂无登记|暂无投放/);
  // honest no-native-checkout / no-third-party-live boundary retained
  assert.match(c(), /非本平台下单/);
});

test('G1-W∞-50: keeps create/approve/place IA + summaryStrip + honest boundary intact', () => {
  assert.match(c(), /推广员工具 · 营销内容/);
  assert.match(c(), /<h1>让内容生产、审批与渠道连接保持可追溯<\/h1>/);
  assert.match(c(), /summaryStrip/);
  assert.match(c(), /data-testid="management-content"/);
  assert.match(c(), /创建草稿/);
  assert.match(c(), /审批并允许投放/);
  assert.match(c(), /登记待授权分发/);
  assert.match(c(), /投放到消费者门店|展示排序/);
});

test('G1-W∞-50: content distribution/bar CSS present + responsive stacking', () => {
  assert.match(cCss(), /\.distribution\s*\{/);
  assert.match(cCss(), /\.panelBlock\s*\{/);
  assert.match(cCss(), /\.barFill\s*\{/);
  assert.match(cCss(), /\.barTrack\s*\{/);
  assert.match(cCss(), /\.barRow\s*\{/);
  assert.match(cCss(), /\.barValue\s*\{/);
  assert.match(cCss(), /\.barEmpty\s*\{/);
  assert.match(cCss(), /\.distribution\s*\{\s*grid-template-columns:\s*1fr;\s*\}/);
  assert.match(cCss(), /\.barFill\s*\{\s*display:\s*block;/);
  assert.match(cCss(), /background:\s*linear-gradient\(90deg,\s*#ffd100,\s*#f0a500\);/);
});

test('G1-W∞-50: honest source=local disclaimer and real-data derivations present', () => {
  assert.match(c(), /source=local/);
  assert.match(c(), /byStatus/);
  assert.match(c(), /byKind/);
  assert.match(c(), /byChannel/);
  assert.match(c(), /byStore/);
});
