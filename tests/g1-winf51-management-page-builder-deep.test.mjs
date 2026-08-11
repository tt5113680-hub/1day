import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), 'utf8');

const c = () => read('apps/management-web/app/m/page-builder/page.tsx');
const cCss = () => read('apps/management-web/app/m/page-builder/page.module.css');

test('G1-W∞-51: page-builder adds real-data 入口页装修分布 panel', () => {
  assert.match(c(), /aria-label="入口页装修分布"/);
  assert.doesNotMatch(c(), /AdminPageHeader/);
  assert.match(c(), /targetCounts\.set/);
  assert.match(c(), /publishCounts\.set/);
  assert.match(c(), /familyCounts\.set/);
  assert.match(c(), /storeCounts\.set/);
  for (const label of ['模板目标分布', '发布状态分布', '行业模板分布', '发布数字门店分布']) {
    assert.match(c(), new RegExp(`<h2>${label}</h2>`));
  }
  assert.match(c(), /templatesTotal \? \(b\.value \/ templatesTotal\) \* 100/);
  assert.match(c(), /publishTotal \? \(b\.value \/ publishTotal\) \* 100/);
  assert.match(c(), /familyTotal \? \(b\.value \/ familyTotal\) \* 100/);
  assert.match(c(), /storeTotal \? \(b\.value \/ storeTotal\) \* 100/);
  assert.match(c(), /数字门店已发布/);
  assert.match(c(), /模板已发布未绑定/);
  assert.match(c(), /尚未发布/);
  assert.match(c(), /未绑定门店/);
  assert.match(c(), /暂无记录/);
  assert.match(c(), /非本平台下单/);
});

test('G1-W∞-51: keeps template/preview IA + summaryStrip + honest boundary intact', () => {
  assert.match(c(), /推广员工具 · 入口页装修/);
  assert.match(c(), /<h1>在固定业务模块内维护模板、预览与版本<\/h1>/);
  assert.match(c(), /summaryStrip/);
  assert.match(c(), /data-testid="management-page-builder"/);
  assert.match(c(), /进入装修/);
  assert.match(c(), /创建装修草稿/);
  assert.match(c(), /生成手机\/PC 预览/);
  assert.match(c(), /同渲染器预览/);
});

test('G1-W∞-51: page-builder distribution/bar CSS present + responsive stacking', () => {
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

test('G1-W∞-51: honest source=local disclaimer and real-data derivations present', () => {
  assert.match(c(), /source=local/);
  assert.match(c(), /byTarget/);
  assert.match(c(), /byPublish/);
  assert.match(c(), /byFamily/);
  assert.match(c(), /byStore/);
});
